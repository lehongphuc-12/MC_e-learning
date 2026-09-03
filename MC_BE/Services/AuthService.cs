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
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ICloudinaryService _cloudinaryService;

    public AuthService(
        IGenericRepository<User> userRepository,
        IGenericRepository<Role> roleRepository,
        IGenericRepository<UserProfile> userProfileRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICloudinaryService cloudinaryService)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _userProfileRepository = userProfileRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _cloudinaryService = cloudinaryService;
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

    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request)
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
        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return ApiResponse<LoginResponse>.FailureResponse("Invalid email or password.");
        }

        // 4. Update last login time
        user.LastLoginAt = DateTime.UtcNow;
        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        // 5. Generate JWT token
        var (token, expiresAt) = _tokenService.GenerateJwtToken(user);

        var loginResponse = new LoginResponse
        {
            User = new UserDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                RoleName = user.Role?.RoleName ?? "Learner",
                AvatarUrl = user.AvatarUrl
            },
            Token = token,
            ExpiresAt = expiresAt
        };

        return ApiResponse<LoginResponse>.SuccessResponse(loginResponse, "Login successful.");
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
            AvatarUrl = user.AvatarUrl
        };

        return ApiResponse<UserDto>.SuccessResponse(userDto, "User details retrieved successfully.");
    }

    public async Task<ApiResponse<UserProfileDto>> GetProfileAsync(GetProfileRequestDto request, int currentUserId)
    {
        var targetUserId = request.UserId ?? currentUserId;
        var usersFound = await _userRepository.FindAsync(
            u => u.UserId == targetUserId,
            u => u.Role,
            u => u.UserProfile
        );
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");
        }

        if (user.Status != "ACTIVE")
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User is not active.");
        }

        return ApiResponse<UserProfileDto>.SuccessResponse(MapToUserProfileDto(user), "User profile retrieved successfully.");
    }

    public async Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
    {
        var usersFound = await _userRepository.FindAsync(
            u => u.UserId == userId,
            u => u.Role,
            u => u.UserProfile
        );
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");
        }

        if (user.Status != "ACTIVE")
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User is not active.");
        }

        // Update User entity basic fields
        if (request.FullName != null)
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.PhoneNumber != null)
        {
            user.PhoneNumber = request.PhoneNumber.Trim();
        }

        user.UpdatedAt = DateTime.UtcNow;

        // Update or create UserProfile entity
        if (user.UserProfile == null)
        {
            user.UserProfile = new UserProfile
            {
                UserId = user.UserId
            };
            await _userProfileRepository.AddAsync(user.UserProfile);
        }

        if (request.Bio != null)
        {
            user.UserProfile.Bio = request.Bio;
        }

        if (request.Gender != null)
        {
            user.UserProfile.Gender = request.Gender;
        }

        if (request.DateOfBirth.HasValue)
        {
            user.UserProfile.DateOfBirth = request.DateOfBirth.Value;
        }

        if (request.ExperienceLevel != null)
        {
            user.UserProfile.ExperienceLevel = request.ExperienceLevel;
        }

        if (request.LearningGoal != null)
        {
            user.UserProfile.LearningGoal = request.LearningGoal;
        }

        if (request.PreferredLanguage != null)
        {
            user.UserProfile.PreferredLanguage = request.PreferredLanguage;
        }

        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<UserProfileDto>.SuccessResponse(MapToUserProfileDto(user), "Profile updated successfully.");
    }

    public async Task<ApiResponse<UserProfileDto>> UpdateAvatarAsync(int userId, UpdateAvatarRequestDto request)
    {
        var usersFound = await _userRepository.FindAsync(
            u => u.UserId == userId,
            u => u.Role,
            u => u.UserProfile
        );
        var user = usersFound.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User not found.");
        }

        if (user.Status != "ACTIVE")
        {
            return ApiResponse<UserProfileDto>.FailureResponse("User is not active.");
        }

        string newAvatarUrl;

        // Mode 1: Local File Upload to Cloudinary
        if (request.File != null && request.File.Length > 0)
        {
            // Validate image file extension
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return ApiResponse<UserProfileDto>.FailureResponse("Invalid file format. Only JPG, JPEG, PNG, GIF, and WEBP image files are allowed.");
            }

            // Upload avatar to Cloudinary in folder 'mc_elearning/avatars'
            var uploadResult = await _cloudinaryService.UploadImageAsync(request.File, "mc_elearning/avatars");

            if (uploadResult.Error != null)
            {
                return ApiResponse<UserProfileDto>.FailureResponse($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            var uploadedUrl = uploadResult.SecureUrl?.AbsoluteUri ?? uploadResult.Url?.AbsoluteUri;
            if (string.IsNullOrEmpty(uploadedUrl))
            {
                return ApiResponse<UserProfileDto>.FailureResponse("Failed to retrieve uploaded image URL from Cloudinary.");
            }

            newAvatarUrl = uploadedUrl;
        }
        // Mode 2: Direct Image URL or Preset Avatar
        else if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
        {
            newAvatarUrl = request.AvatarUrl.Trim();
        }
        else
        {
            return ApiResponse<UserProfileDto>.FailureResponse("Please select an avatar image file or provide an avatar URL.");
        }

        // Update User avatar URL
        user.AvatarUrl = newAvatarUrl;
        user.UpdatedAt = DateTime.UtcNow;

        _userRepository.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<UserProfileDto>.SuccessResponse(MapToUserProfileDto(user), "Avatar updated successfully.");
    }

    private static UserProfileDto MapToUserProfileDto(User user)
    {
        var profile = user.UserProfile;
        return new UserProfileDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            AvatarUrl = user.AvatarUrl,
            RoleName = user.Role?.RoleName ?? "Learner",
            Bio = profile?.Bio,
            Gender = profile?.Gender,
            DateOfBirth = profile?.DateOfBirth,
            ExperienceLevel = profile?.ExperienceLevel,
            LearningGoal = profile?.LearningGoal,
            PreferredLanguage = profile?.PreferredLanguage ?? "en"
        };
    }
}
