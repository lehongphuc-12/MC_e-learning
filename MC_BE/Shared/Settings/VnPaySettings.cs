namespace MC_BE.Shared.Settings;

public class VnPaySettings
{
    public string TmnCode { get; set; } = string.Empty;

    public string HashSecret { get; set; } = string.Empty;

    public string PaymentUrl { get; set; }
        = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public string ApiUrl { get; set; }
        = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

    public string ReturnUrl { get; set; } = string.Empty;

    public string FrontendResultUrl { get; set; } = string.Empty;
}