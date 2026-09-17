namespace MC_BE.Shared.Services.Interfaces;

public interface ICurrentUserService
{
    string GetUserId();
    string? GetUserEmail();
    string? GetUserRole();
    bool IsInRole(string role);
    void RequireAdmin();
    void RequireLearner();
    void RequireInstructor();
}