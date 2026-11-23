using System.Security.Claims;
using MC_BE.Core.Entities;
using MC_BE.Shared.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Notifications;
[ApiController, Authorize, Route("api/notifications")]
public class NotificationsController(SmartMcDbContext db) : ControllerBase
{
    private int CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1)
    {
        if (CurrentUserId == 0) return Unauthorized();
        page = Math.Clamp(page, 1, 100000);
        var items = await db.Notifications.AsNoTracking().Where(n => n.UserId == CurrentUserId)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).Skip((page - 1) * 30).Take(30).ToListAsync();
        var unreadCount = await db.Notifications.CountAsync(n => n.UserId == CurrentUserId && !n.IsRead);
        return Ok(new { items, unreadCount });
    }
    [HttpGet("unread-count")]
    public async Task<IActionResult> Count() => CurrentUserId == 0 ? Unauthorized() : Ok(new { unreadCount = await db.Notifications.CountAsync(n => n.UserId == CurrentUserId && !n.IsRead) });
    [HttpPatch("{id:long}/read")]
    public async Task<IActionResult> Read(long id)
    {
        if (CurrentUserId == 0) return Unauthorized();
        var n = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == CurrentUserId);
        if (n == null) return NotFound();
        n.IsRead = true; await db.SaveChangesAsync(); return NoContent();
    }
    [HttpPatch("read-all")]
    public async Task<IActionResult> ReadAll()
    {
        if (CurrentUserId == 0) return Unauthorized();
        await db.Notifications.Where(n => n.UserId == CurrentUserId && !n.IsRead).ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return NoContent();
    }
}
