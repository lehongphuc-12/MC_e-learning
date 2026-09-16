using System.Security.Claims;

namespace MC_BE.Features.EnrollmentPayment;

public interface ICurrentUserService
{
    string GetUserId();

    void RequireLearner();

    void RequireAdmin();
}

public class CurrentUserService
    : ICurrentUserService
{
    private readonly IHttpContextAccessor _context;

    public CurrentUserService(
        IHttpContextAccessor context)
    {
        _context = context;
    }

    private ClaimsPrincipal User =>
        _context.HttpContext?.User
        ?? throw new UnauthorizedAccessException(
            "Authentication required."
        );

    public string GetUserId()
    {
        if (
            User.Identity?.IsAuthenticated
            != true
        )
        {
            throw new UnauthorizedAccessException(
                "Please login first."
            );
        }

        var id =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier
            )
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId")
            ?? User.FindFirstValue("id");

        if (
            string.IsNullOrWhiteSpace(id)
        )
        {
            throw new UnauthorizedAccessException(
                "User ID does not exist in JWT."
            );
        }

        return id;
    }

    public void RequireLearner()
    {
        _ = GetUserId();

        if (
            !HasRole(
                "Learner",
                "LEARNER",
                "Student",
                "STUDENT"
            )
        )
        {
            throw new UnauthorizedAccessException(
                "Only learners can perform this action."
            );
        }
    }

    public void RequireAdmin()
    {
        _ = GetUserId();

        if (
            !HasRole(
                "Administrator",
                "ADMINISTRATOR",
                "Admin",
                "ADMIN"
            )
        )
        {
            throw new UnauthorizedAccessException(
                "Administrator permission required."
            );
        }
    }

    private bool HasRole(
        params string[] accepted)
    {
        var roles =
            User.Claims
                .Where(x =>
                    x.Type ==
                        ClaimTypes.Role
                    ||
                    x.Type.Equals(
                        "role",
                        StringComparison
                            .OrdinalIgnoreCase
                    )
                )
                .Select(x => x.Value)
                .ToHashSet(
                    StringComparer
                        .OrdinalIgnoreCase
                );

        return accepted.Any(
            roles.Contains
        );
    }
}