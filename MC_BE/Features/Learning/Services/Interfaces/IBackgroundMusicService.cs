using MC_BE.Features.Learning.DTOs;
using Microsoft.AspNetCore.Http;

namespace MC_BE.Features.Learning.Services.Interfaces;

public interface IBackgroundMusicService
{
    Task<List<BackgroundMusicDto>> GetDefaultMusicsAsync();
    Task<List<BackgroundMusicDto>> GetMusicsForLessonAsync(int lessonId);
    Task<BackgroundMusicDto> UploadMusicForLessonAsync(int lessonId, IFormFile file, string title, int instructorId);
    Task<PreUploadMusicResultDto> PreUploadMusicAsync(IFormFile file, string title, int instructorId);
    Task<List<BackgroundMusicDto>> LinkMusicsToLessonAsync(int lessonId, List<LinkBackgroundMusicItem> musics, int instructorId);
    Task<bool> DeleteMusicAsync(int musicId, int instructorId);
}
