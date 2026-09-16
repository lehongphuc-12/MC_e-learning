using MC_BE.DTOs;
using MC_BE.DTOs.auth;
using MC_BE.Models.Entities;
using MC_BE.Repositories;
using MC_BE.Services.Interfaces;

namespace MC_BE.Services;

public class UserProfileService : IUserProfileService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<UserProfile> _userProfileRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICloudinaryService _cloudinaryService;

    public UserProfileService(
        IGenericRepository<User> userRepository,
        IGenericRepository<UserProfile> userProfileRepository,
        IUnitOfWork unitOfWork,
        ICloudinaryService cloudinaryService)
    {
        _userRepository = userRepository;
        _userProfileRepository = userProfileRepository;
        _unitOfWork = unitOfWork;
        _cloudinaryService = cloudinaryService;
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
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(extension) || !allowedExtensions.Contains(extension))
            {
                return ApiResponse<UserProfileDto>.FailureResponse("Invalid file format. Only JPG, JPEG, PNG, GIF, and WEBP image files are allowed.");
            }

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
