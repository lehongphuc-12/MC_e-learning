using FluentAssertions;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using MC_BE.Features.Courses.Services;
using Xunit;

namespace MC_BE.Tests.Features.Courses;

public class LessonVideoUrlResolverTests
{
    private const string SampleDriveViewUrl =
        "https://drive.google.com/file/d/1IJDSx_7xGWFXZ3Vzl_sEScNuyw_2dFNF/view?usp=drive_link";

    private const string SampleDrivePreviewUrl =
        "https://drive.google.com/file/d/1IJDSx_7xGWFXZ3Vzl_sEScNuyw_2dFNF/preview";

    [Fact]
    public void Resolve_prefers_video_material_even_when_other_materials_exist()
    {
        var materials = new List<CourseMaterial>
        {
            new() { MaterialType = MaterialType.DOCUMENT, FileUrl = "https://example.com/script.pdf" },
            new() { MaterialType = MaterialType.VIDEO, FileUrl = SampleDriveViewUrl },
        };

        LessonVideoUrlResolver.Resolve(materials).Should().Be(SampleDrivePreviewUrl);
    }

    [Fact]
    public void Resolve_returns_drive_url_imported_as_other_material_from_excel()
    {
        var materials = new List<CourseMaterial>
        {
            new()
            {
                MaterialType = MaterialType.OTHER,
                FileUrl = SampleDriveViewUrl,
            },
        };

        LessonVideoUrlResolver.Resolve(materials).Should().Be(SampleDrivePreviewUrl);
    }

    [Fact]
    public void Resolve_keeps_youtube_watch_urls()
    {
        var youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
        var materials = new List<CourseMaterial>
        {
            new() { MaterialType = MaterialType.VIDEO, FileUrl = youtube },
        };

        LessonVideoUrlResolver.Resolve(materials).Should().Be(youtube);
    }

    [Fact]
    public void Normalize_converts_open_id_drive_links()
    {
        var url = "https://drive.google.com/open?id=1IJDSx_7xGWFXZ3Vzl_sEScNuyw_2dFNF";

        LessonVideoUrlResolver.NormalizeStoredUrl(url).Should().Be(SampleDrivePreviewUrl);
    }

    [Fact]
    public void Normalize_converts_uc_export_drive_links()
    {
        var url = "https://drive.google.com/uc?export=download&id=1IJDSx_7xGWFXZ3Vzl_sEScNuyw_2dFNF";

        LessonVideoUrlResolver.NormalizeStoredUrl(url).Should().Be(SampleDrivePreviewUrl);
    }

    [Fact]
    public void Resolve_returns_null_when_no_playable_url_exists()
    {
        LessonVideoUrlResolver.Resolve(new List<CourseMaterial>()).Should().BeNull();
        LessonVideoUrlResolver.Resolve(null).Should().BeNull();
    }
}
