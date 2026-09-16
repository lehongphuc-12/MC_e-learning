using MC_BE.Data;
using MC_BE.DTOs;
using MC_BE.DTOs.auth;
using MC_BE.Models.Entities;
using MC_BE.Models.Enums;
using MC_BE.Repositories;
using MC_BE.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Services;

public class AuthService : IAuthService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IGenericRepository<UserProfile> _userProfileRepository;
    private readonly IGenericRepository<PasswordResetToken> _resetTokenRepository;
    private readonly IGenericRepository<RefreshToken> _refreshTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IEmailService _emailService;
    private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;

    public AuthService(
        IGenericRepository<User> userRepository,
        IGenericRepository<Role> roleRepository,
        IGenericRepository<UserProfile> userProfileRepository,
        IGenericRepository<PasswordResetToken> resetTokenRepository,
        IGenericRepository<RefreshToken> refreshTokenRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICloudinaryService cloudinaryService,
        IEmailService emailService,
        Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _userProfileRepository = userProfileRepository;
        _resetTokenRepository = resetTokenRepository;
        _refreshTokenRepository = refreshTokenRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _cloudinaryService = cloudinaryService;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<ApiResponse<LoginResponse>> GoogleLoginAsync(GoogleLoginRequest request, HttpResponse httpResponse)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return ApiResponse<LoginResponse>.FailureResponse("Google ID Token is required.");
        }

        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            var googleClientId = _configuration["Authentication:Google:ClientId"];
            var settings = new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings();
            if (!string.IsNullOrEmpty(googleClientId))
            {
                settings.Audience = new[] { googleClientId };
            }

            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
        }
        catch (Exception ex)
        {
            return ApiResponse<LoginResponse>.FailureResponse($"Invalid Google token: {ex.Message}");
        }

        if (string.IsNullOrEmpty(payload.Email))
        {
            return ApiResponse<LoginResponse>.FailureResponse("Google account email not found.");
        }

        var emailNormalized = payload.Email.Trim().ToLower();
        var usersFoundWithRole = await _userRepository.FindAsync(u => u.Email.ToLower() == emailNormalized, u => u.Role);
        var user = usersFoundWithRole.FirstOrDefault();

        if (user == null)
        {
            // 1. Get default role 'Learner'
            var rolesFoundByName = await _roleRepository.FindAsync(r => r.RoleName == "Learner");
            var defaultRole = rolesFoundByName.FirstOrDefault();

            if (defaultRole == null)
            {
                var rolesFoundById = await _roleRepository.FindAsync(r => r.RoleId == (int)UserRole.Learner);
                defaultRole = rolesFoundById.FirstOrDefault();
            }

            if (defaultRole == null)
            {
                return ApiResponse<LoginResponse>.FailureResponse("System error: Default role 'Learner' could not be found.");
            }

            // 2. Create new user from Google payload
            user = new User
            {
                FullName = payload.Name ?? payload.Email,
                Email = payload.Email,
                PasswordHash = null,
                IsGoogleLogin = true,
                AvatarUrl = payload.Picture,
                RoleId = defaultRole.RoleId,
                Status = "ACTIVE",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow
            };

            var userProfile = new UserProfile
            {
                User = user,
                PreferredLanguage = "en"
            };

            await _userRepository.AddAsync(user);
            await _userProfileRepository.AddAsync(userProfile);
            await _unitOfWork.SaveChangesAsync();

            // Re-fetch user with Role reference loaded
            var createdUsers = await _userRepository.FindAsync(u => u.UserId == user.UserId, u => u.Role);
            user = createdUsers.FirstOrDefault() ?? user;
        }
        else
        {
            if (user.Status != "ACTIVE")
            {
                return ApiResponse<LoginResponse>.FailureResponse("This account has been deactivated.");
            }

            // Update Avatar if empty and available from Google
            if (string.IsNullOrEmpty(user.AvatarUrl) && !string.IsNullOrEmpty(payload.Picture))
            {
                user.AvatarUrl = payload.Picture;
            }

            user.LastLoginAt = DateTime.UtcNow;
            _userRepository.Update(user);
            await _unitOfWork.SaveChangesAsync();
        }

        // Generate JWT Access Token & Refresh Token
        var (token, expiresAt) = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken(user.UserId);
        await _refreshTokenRepository.AddAsync(refreshToken);
        await _unitOfWork.SaveChangesAsync();

        _tokenService.SetRefreshTokenCookie(httpResponse, refreshToken.Token, refreshToken.ExpiresAt);

        var loginResponse = new LoginResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                RoleName = user.Role?.RoleName ?? "Learner",
                AvatarUrl = user.AvatarUrl,
                IsGoogleLogin = user.IsGoogleLogin
            },
            Token = token,
            ExpiresAt = expiresAt
        };

        return ApiResponse<LoginResponse>.SuccessResponse(loginResponse, "Google login successful.");
    }

    public async Task<ApiResponse<UserDto>> RegisterAsync(RegisterRequest request)
    {
        // 1. Check if email already exists
        var emailNormalized = request.Email.Trim().ToLower();
        var usersFound = await _userRepository.FindAsync(u => u.Email.ToLower() == emailNormalized);
        if (usersFound.Any())
        {
            return ApiResponse<UserDto>.FailureResponse("Email is already registered.");
        }

        // 2. Get default role 'Learner'
        var rolesFoundByName = await _roleRepository.FindAsync(r => r.RoleName == "Learner");
        var defaultRole = rolesFoundByName.FirstOrDefault();

        if (defaultRole == null)
        {
            var rolesFoundById = await _roleRepository.FindAsync(r => r.RoleId == (int)UserRole.Learner);
            defaultRole = rolesFoundById.FirstOrDefault();
        }

        if (defaultRole == null)
        {
            return ApiResponse<UserDto>.FailureResponse("System error: Default role 'Learner' could not be found.");
        }

        // 3. Create the user entity
        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            PhoneNumber = request.PhoneNumber,
            RoleId = defaultRole.RoleId,
            Status = "ACTIVE",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 4. Create associated user profile
        var userProfile = new UserProfile
        {
            User = user,
            PreferredLanguage = "en"
        };

        await _userRepository.AddAsync(user);
        await _userProfileRepository.AddAsync(userProfile);
        await _unitOfWork.SaveChangesAsync();

        var userDto = new UserDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            RoleName = defaultRole.RoleName,
            AvatarUrl = user.AvatarUrl
        };

        return ApiResponse<UserDto>.SuccessResponse(userDto, "Registration successful.");
    }

    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, HttpResponse httpResponse)
    {
        var emailNormalized = request.Email.Trim().ToLower();

        // 1. Fetch user including role using the updated generic repository with Include support
        var usersFoundWithRole = await _userRepository.FindAsync(u => u.Email.ToLower() == emailNormalized, u => u.Role);
        var user = usersFoundWithRole.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<LoginResponse>.FailureResponse("Invalid email or password.");
        }

        // 2. Check if user is active
        if (user.Status != "ACTIVE")
        {
            return ApiResponse<LoginResponse>.FailureResponse("This account has been deactivated.");
        }

        // 3. Verify password
        if (string.IsNullOrEmpty(user.PasswordHash) || user.IsGoogleLogin)
        {
            return ApiResponse<LoginResponse>.FailureResponse("Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.");
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return ApiResponse<LoginResponse>.FailureResponse("Invalid email or password.");
        }

        // 4. Update last login time
        user.LastLoginAt = DateTime.UtcNow;
        _userRepository.Update(user);

        // 5. Generate Access Token & Refresh Token
        var (token, expiresAt) = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken(user.UserId);
        await _refreshTokenRepository.AddAsync(refreshToken);
        await _unitOfWork.SaveChangesAsync();

        _tokenService.SetRefreshTokenCookie(httpResponse, refreshToken.Token, refreshToken.ExpiresAt);

        var loginResponse = new LoginResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                RoleName = user.Role?.RoleName ?? "Learner",
                AvatarUrl = user.AvatarUrl,
                IsGoogleLogin = user.IsGoogleLogin
            },
            Token = token,
            ExpiresAt = expiresAt
        };

        return ApiResponse<LoginResponse>.SuccessResponse(loginResponse, "Login successful.");
    }

    public async Task<ApiResponse<RefreshTokenResponseDto>> RefreshTokenAsync(string? requestRefreshToken, HttpRequest httpRequest, HttpResponse httpResponse)
    {
        var refreshTokenString = httpRequest.Cookies["refreshToken"] ?? requestRefreshToken;

        if (string.IsNullOrWhiteSpace(refreshTokenString))
        {
            return ApiResponse<RefreshTokenResponseDto>.FailureResponse("Refresh token is required.");
        }

        var tokensFound = await _refreshTokenRepository.FindAsync(t => t.Token == refreshTokenString, t => t.User, t => t.User.Role);
        var existingToken = tokensFound.FirstOrDefault();

        if (existingToken == null || !existingToken.IsActive)
        {
            _tokenService.ClearRefreshTokenCookie(httpResponse);
            return ApiResponse<RefreshTokenResponseDto>.FailureResponse("Invalid or expired refresh token.");
        }

        if (existingToken.User.Status != "ACTIVE")
        {
            _tokenService.ClearRefreshTokenCookie(httpResponse);
            return ApiResponse<RefreshTokenResponseDto>.FailureResponse("User account is inactive.");
        }

        // Token Rotation: Revoke existing token and create a new one
        var newRefreshToken = _tokenService.GenerateRefreshToken(existingToken.UserId);
        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.ReplacedByToken = newRefreshToken.Token;

        _refreshTokenRepository.Update(existingToken);
        await _refreshTokenRepository.AddAsync(newRefreshToken);
        await _unitOfWork.SaveChangesAsync();

        _tokenService.SetRefreshTokenCookie(httpResponse, newRefreshToken.Token, newRefreshToken.ExpiresAt);

        var (accessToken, expiresAt) = _tokenService.GenerateJwtToken(existingToken.User);

        var response = new RefreshTokenResponseDto
        {
            AccessToken = accessToken,
            ExpiresAt = expiresAt
        };

        return ApiResponse<RefreshTokenResponseDto>.SuccessResponse(response, "Token refreshed successfully.");
    }

    public async Task<ApiResponse<string>> LogoutAsync(string? requestRefreshToken, HttpRequest httpRequest, HttpResponse httpResponse)
    {
        var refreshTokenString = httpRequest.Cookies["refreshToken"] ?? requestRefreshToken;

        if (!string.IsNullOrWhiteSpace(refreshTokenString))
        {
            var tokensFound = await _refreshTokenRepository.FindAsync(t => t.Token == refreshTokenString);
            var tokenEntity = tokensFound.FirstOrDefault();

            if (tokenEntity != null && tokenEntity.IsActive)
            {
                tokenEntity.RevokedAt = DateTime.UtcNow;
                _refreshTokenRepository.Update(tokenEntity);
                await _unitOfWork.SaveChangesAsync();
            }
        }

        _tokenService.ClearRefreshTokenCookie(httpResponse);
        return ApiResponse<string>.SuccessResponse("Logged out successfully.");
    }

    public async Task<ApiResponse<UserDto>> GetMeAsync(int userId)
    {
        var usersFound = await _userRepository.FindAsync(u => u.UserId == userId, u => u.Role);
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<UserDto>.FailureResponse("User not found.");
        }

        if (user.Status != "ACTIVE")
        {
            return ApiResponse<UserDto>.FailureResponse("User is not active.");
        }

        var userDto = new UserDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            RoleName = user.Role?.RoleName ?? "Learner",
            AvatarUrl = user.AvatarUrl,
            IsGoogleLogin = user.IsGoogleLogin
        };

        return ApiResponse<UserDto>.SuccessResponse(userDto, "User details retrieved successfully.");
    }

    public async Task<ApiResponse<string>> ForgotPasswordAsync(ForgotPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return ApiResponse<string>.FailureResponse("Email is required.");
        }

        var emailNormalized = request.Email.Trim().ToLower();
        var usersFound = await _userRepository.FindAsync(u => u.Email.ToLower() == emailNormalized);
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            // Security best practice: return success even if user not found to prevent email enumeration
            return ApiResponse<string>.SuccessResponse("If an account exists for this email, a password reset link has been sent.");
        }

        // Generate a secure random token (Single-use token)
        var resetTokenString = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

        // Save token to DB (valid for 15 minutes)
        var resetTokenEntity = new PasswordResetToken
        {
            UserId = user.UserId,
            Token = resetTokenString,
            ExpiresAt = DateTime.UtcNow.AddMinutes(15),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        await _resetTokenRepository.AddAsync(resetTokenEntity);
        await _unitOfWork.SaveChangesAsync();
        
        var clientBaseUrl = _configuration["ClientUrl"] ?? "http://localhost:5173";
        var resetLink = $"{clientBaseUrl}/reset-password?token={Uri.EscapeDataString(resetTokenString)}&email={Uri.EscapeDataString(user.Email)}";

        var emailSubject = "Reset Your Password - MSEEK";
        var emailBody = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;"">
                <h2 style=""color: #4F46E5; text-align: center;"">Reset Your Password</h2>
                <p>Hello <strong>{user.FullName}</strong>,</p>
                <p>We received a request to reset your password for your MSEEK account. Click the button below to reset it (link expires in 15 minutes):</p>
                <div style=""text-align: center; margin: 30px 0;"">
                    <a href=""{resetLink}"" style=""background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Reset Password</a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style=""word-break: break-all; color: #6B7280;"">{resetLink}</p>
                <p>If you did not request a password reset, you can safely ignore this email.</p>
                <hr style=""border: none; border-top: 1px solid #eeeeee; margin: 20px 0;"" />
                <p style=""font-size: 12px; color: #9CA3AF; text-align: center;"">&copy; 2026 MSEEK E-Learning. All rights reserved.</p>
            </div>";

        await _emailService.SendEmailAsync(user.Email, emailSubject, emailBody, isHtml: true);

        return ApiResponse<string>.SuccessResponse("If an account exists for this email, a password reset link has been sent.");
    }

    public async Task<ApiResponse<string>> ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return ApiResponse<string>.FailureResponse("Token, Email, and New Password are required.");
        }

        var emailNormalized = request.Email.Trim().ToLower();
        var usersFound = await _userRepository.FindAsync(u => u.Email.ToLower() == emailNormalized);
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<string>.FailureResponse("Invalid password reset request.");
        }

        // Find token entity matching User, Token string, not used and not expired
        var tokensFound = await _resetTokenRepository.FindAsync(t => t.UserId == user.UserId && t.Token == request.Token);
        var tokenEntity = tokensFound.FirstOrDefault();

        if (tokenEntity == null)
        {
            return ApiResponse<string>.FailureResponse("Invalid or expired password reset token.");
        }

        if (tokenEntity.IsUsed)
        {
            return ApiResponse<string>.FailureResponse("This password reset link has already been used. Please request a new link.");
        }

        if (tokenEntity.ExpiresAt < DateTime.UtcNow)
        {
            return ApiResponse<string>.FailureResponse("This password reset link has expired. Please request a new link.");
        }

        // Update User password
        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        _userRepository.Update(user);

        // Mark token as USED so link cannot be reused
        tokenEntity.IsUsed = true;
        _resetTokenRepository.Update(tokenEntity);

        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<string>.SuccessResponse("Your password has been reset successfully. You can now log in with your new password.");
    }

    public async Task<ApiResponse<string>> ChangePasswordAsync(int userId, ChangePasswordRequestDto request)
    {
        var usersFound = await _userRepository.FindAsync(u => u.UserId == userId);
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<string>.FailureResponse("User not found.");
        }

        if (user.Status != "ACTIVE")
        {
            return ApiResponse<string>.FailureResponse("User account is inactive.");
        }

        // Standard accounts require OldPassword check; Google accounts do not.
        bool isGoogleUser = user.IsGoogleLogin || string.IsNullOrEmpty(user.PasswordHash);

        if (!isGoogleUser)
        {
            if (string.IsNullOrWhiteSpace(request.OldPassword))
            {
                return ApiResponse<string>.FailureResponse("Old password is required.");
            }

            var isPasswordValid = _passwordHasher.VerifyPassword(request.OldPassword, user.PasswordHash!);
            if (!isPasswordValid)
            {
                return ApiResponse<string>.FailureResponse("Incorrect old password.");
            }
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.IsGoogleLogin = false;
        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<string>.SuccessResponse("Password changed successfully.");
    }
}
