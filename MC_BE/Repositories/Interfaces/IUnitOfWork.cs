namespace MC_BE.Repositories;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveChangesAsync();
}
