using MC_BE.Data;
using MC_BE.DTOs;
using MC_BE.Models.Entities;
using MC_BE.Models.Enums;
using MC_BE.Repositories;
using MC_BE.Services.Interfaces;
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

    public AuthService(
        IGenericRepository<User> userRepository,
        IGenericRepository<Role> roleRepository,
        IGenericRepository<UserProfile> userProfileRepository,
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _userProfileRepository = userProfileRepository;
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
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
                RoleName = user.Role.RoleName,
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
            RoleName = user.Role.RoleName,
            AvatarUrl = user.AvatarUrl
        };

        return ApiResponse<UserDto>.SuccessResponse(userDto, "User details retrieved successfully.");
    }
}
