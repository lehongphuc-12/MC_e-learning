using MC_BE.Shared.Data;
using Microsoft.EntityFrameworkCore;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Data;

namespace MC_BE.Shared.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly SmartMcDbContext _context;
    public UnitOfWork(SmartMcDbContext context)
    {
        _context = context;
    }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task ExecuteInTransactionAsync(Func<Task> operation)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await operation();
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
