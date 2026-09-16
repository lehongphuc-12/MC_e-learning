using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using MC_BE.DTOs;
using MC_BE.Helpers;
using MC_BE.Models.Entities;
using MC_BE.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace MC_BE.Services;

public class VnPayService : IVnPayService
{
    private readonly VnPaySettings _settings;
    private readonly HttpClient _httpClient;

    public VnPayService(
        IOptions<VnPaySettings> options,
        HttpClient httpClient)
    {
        _settings = options.Value;
        _httpClient = httpClient;
    }

    public string CreatePaymentUrl(
        Payment payment,
        string ipAddress)
    {
        ValidateConfiguration();

        var vnNow = GetVietnamTime();

        var data = new Dictionary<string, string>
        {
            ["vnp_Version"] = "2.1.0",

            ["vnp_Command"] = "pay",

            ["vnp_TmnCode"] = _settings.TmnCode,

            ["vnp_Amount"] =
                ((long)(payment.Amount * 100))
                .ToString(CultureInfo.InvariantCulture),

            ["vnp_CreateDate"] =
                vnNow.ToString("yyyyMMddHHmmss"),

            ["vnp_CurrCode"] = "VND",

            ["vnp_IpAddr"] =
                NormalizeIp(ipAddress),

            ["vnp_Locale"] = "vn",

            ["vnp_OrderInfo"] =
                payment.OrderInfo
                ?? "MSEEK Course Payment",

            ["vnp_OrderType"] = "other",

            ["vnp_ReturnUrl"] =
                _settings.ReturnUrl,

            ["vnp_TxnRef"] =
                payment.MerchantTxnRef,

            ["vnp_ExpireDate"] =
                vnNow
                    .AddMinutes(15)
                    .ToString("yyyyMMddHHmmss")
        };

        var hashData =
            BuildQueryString(data);

        var secureHash =
            HmacSha512(
                _settings.HashSecret,
                hashData
            );

        return
            $"{_settings.PaymentUrl}" +
            $"?{hashData}" +
            $"&vnp_SecureHash={secureHash}";
    }

    public bool ValidateSignature(
        IQueryCollection query)
    {
        ValidateConfiguration();

        var receivedHash =
            query["vnp_SecureHash"].ToString();

        if (string.IsNullOrWhiteSpace(receivedHash))
        {
            return false;
        }

        var data =
            query
                .Where(x =>
                    !x.Key.Equals(
                        "vnp_SecureHash",
                        StringComparison.OrdinalIgnoreCase
                    )
                    &&
                    !x.Key.Equals(
                        "vnp_SecureHashType",
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                .ToDictionary(
                    x => x.Key,
                    x => x.Value.ToString()
                );

        var hashData =
            BuildQueryString(data);

        var expectedHash =
            HmacSha512(
                _settings.HashSecret,
                hashData
            );

        return string.Equals(
            receivedHash,
            expectedHash,
            StringComparison.OrdinalIgnoreCase
        );
    }

    public async Task<VnPayQueryResultDto>
        QueryTransactionAsync(
            Payment payment,
            string ipAddress)
    {
        ValidateConfiguration();

        var vnNow =
            GetVietnamTime();

        var transactionDate =
            ConvertToVietnamTime(
                payment.CreatedAt
            );

        var requestId =
            Guid.NewGuid()
                .ToString("N")[..24];

        var createDate =
            vnNow.ToString(
                "yyyyMMddHHmmss"
            );

        var transactionDateString =
            transactionDate.ToString(
                "yyyyMMddHHmmss"
            );

        var orderInfo =
            $"Query payment {payment.MerchantTxnRef}";

        var checksumData =
            string.Join(
                "|",
                requestId,
                "2.1.0",
                "querydr",
                _settings.TmnCode,
                payment.MerchantTxnRef,
                transactionDateString,
                createDate,
                NormalizeIp(ipAddress),
                orderInfo
            );

        var body =
            new Dictionary<string, string>
            {
                ["vnp_RequestId"] =
                    requestId,

                ["vnp_Version"] =
                    "2.1.0",

                ["vnp_Command"] =
                    "querydr",

                ["vnp_TmnCode"] =
                    _settings.TmnCode,

                ["vnp_TxnRef"] =
                    payment.MerchantTxnRef,

                ["vnp_OrderInfo"] =
                    orderInfo,

                ["vnp_TransactionDate"] =
                    transactionDateString,

                ["vnp_CreateDate"] =
                    createDate,

                ["vnp_IpAddr"] =
                    NormalizeIp(ipAddress),

                ["vnp_SecureHash"] =
                    HmacSha512(
                        _settings.HashSecret,
                        checksumData
                    )
            };

        var response =
            await _httpClient.PostAsJsonAsync(
                _settings.ApiUrl,
                body
            );

        var raw =
            await response.Content
                .ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            return new VnPayQueryResultDto
            {
                RequestSucceeded = false,

                ResponseCode =
                    ((int)response.StatusCode)
                    .ToString(),

                Message =
                    "Unable to retrieve payment information from VNPay.",

                RawResponse = raw
            };
        }

        using var json =
            JsonDocument.Parse(raw);

        var root =
            json.RootElement;

        string? GetValue(string key)
        {
            return root.TryGetProperty(
                key,
                out var property
            )
                ? property.ToString()
                : null;
        }

        decimal? amount = null;

        if (
            decimal.TryParse(
                GetValue("vnp_Amount"),
                out var rawAmount
            )
        )
        {
            amount = rawAmount / 100;
        }

        return new VnPayQueryResultDto
        {
            RequestSucceeded =
                GetValue("vnp_ResponseCode")
                == "00",

            ResponseCode =
                GetValue("vnp_ResponseCode"),

            Message =
                GetValue("vnp_Message"),

            TransactionStatus =
                GetValue(
                    "vnp_TransactionStatus"
                ),

            TransactionNo =
                GetValue(
                    "vnp_TransactionNo"
                ),

            BankCode =
                GetValue("vnp_BankCode"),

            Amount = amount,

            RawResponse = raw
        };
    }

    private static string BuildQueryString(
        IDictionary<string, string> data)
    {
        return string.Join(
            "&",
            data
                .Where(x =>
                    !string.IsNullOrWhiteSpace(
                        x.Value
                    )
                )
                .OrderBy(x => x.Key)
                .Select(x =>
                    $"{WebUtility.UrlEncode(x.Key)}" +
                    "=" +
                    $"{WebUtility.UrlEncode(x.Value)}"
                )
        );
    }

    private static string HmacSha512(
        string secret,
        string data)
    {
        var keyBytes =
            Encoding.UTF8.GetBytes(secret);

        var dataBytes =
            Encoding.UTF8.GetBytes(data);

        using var hmac =
            new HMACSHA512(keyBytes);

        var hash =
            hmac.ComputeHash(dataBytes);

        return Convert
            .ToHexString(hash)
            .ToLowerInvariant();
    }

    private static string NormalizeIp(
        string? ip)
    {
        if (
            string.IsNullOrWhiteSpace(ip)
            ||
            ip == "::1"
        )
        {
            return "127.0.0.1";
        }

        return ip;
    }

    private static DateTime GetVietnamTime()
    {
        return ConvertToVietnamTime(
            DateTime.UtcNow
        );
    }

    private static DateTime ConvertToVietnamTime(
        DateTime utc)
    {
        var utcTime =
            DateTime.SpecifyKind(
                utc,
                DateTimeKind.Utc
            );

        var timezone =
            TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows()
                    ? "SE Asia Standard Time"
                    : "Asia/Ho_Chi_Minh"
            );

        return TimeZoneInfo
            .ConvertTimeFromUtc(
                utcTime,
                timezone
            );
    }

    private void ValidateConfiguration()
    {
        if (
            string.IsNullOrWhiteSpace(
                _settings.TmnCode
            )
            ||
            string.IsNullOrWhiteSpace(
                _settings.HashSecret
            )
        )
        {
            throw new InvalidOperationException(
                "VNPay configuration is missing."
            );
        }
    }
}