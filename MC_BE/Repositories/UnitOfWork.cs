using MC_BE.Data;

namespace MC_BE.Repositories;

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

    public void Dispose()
    {
        _context.Dispose();
    }
}