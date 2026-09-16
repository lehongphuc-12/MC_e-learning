using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories.Interfaces;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MC_BE.Shared.Data;

namespace MC_BE.Shared.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    private readonly SmartMcDbContext _context;
    public GenericRepository(SmartMcDbContext context)
    {
        _context = context;
    }
    public async Task<IEnumerable<T>> GetAllAsync(params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _context.Set<T>();
        foreach (var include in includes)
        {
            query = query.Include(include);
        }
        return await query.ToListAsync();
    }
    public async Task<T?> GetByIdAsync(object id)
    {
        return await _context.Set<T>().FindAsync(id);
    }
    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate, params Expression<Func<T, object>>[] includes)
    {
        IQueryable<T> query = _context.Set<T>();
        foreach (var include in includes)
        {
            query = query.Include(include);
        }
        return await query.Where(predicate).ToListAsync();
    }
    public async Task AddAsync(T entity)
    {
        await _context.Set<T>().AddAsync(entity);
    }
    public void Update(T entity)
    {
        _context.Set<T>().Update(entity);
    }
    public void Remove(T entity)
    {
        _context.Set<T>().Remove(entity);
    }
}