using System.IO;
using System.Text;
using System.Threading;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using MC_BE.Features.Learning.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace MC_BE.Tests.Features.Learning.SpeakingScriptParserServiceTests;

public abstract class SpeakingScriptParserServiceTestBase
{
    protected readonly Mock<ILogger<SpeakingScriptParserService>> LoggerMock = new();
    protected readonly SpeakingScriptParserService Service;

    protected SpeakingScriptParserServiceTestBase()
    {
        Service = new SpeakingScriptParserService(LoggerMock.Object);
    }

    protected IFormFile CreateMockTxtFile(string fileName, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return CreateMockCustomFile(fileName, bytes);
    }

    protected IFormFile CreateMockMdFile(string fileName, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return CreateMockCustomFile(fileName, bytes);
    }

    protected IFormFile CreateMockDocxFile(string fileName, params string[] lines)
    {
        using var ms = new MemoryStream();
        using (var wordDoc = WordprocessingDocument.Create(ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document, true))
        {
            var mainPart = wordDoc.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());
            var body = mainPart.Document.Body!;
            foreach (var line in lines)
            {
                body.AppendChild(new Paragraph(new Run(new Text(line))));
            }
            mainPart.Document.Save();
        }
        var bytes = ms.ToArray();
        return CreateMockCustomFile(fileName, bytes);
    }

    protected IFormFile CreateMockCustomFile(string fileName, byte[] bytes)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(bytes.Length);
        fileMock.Setup(f => f.OpenReadStream()).Returns(() => new MemoryStream(bytes));
        fileMock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns((Stream target, CancellationToken ct) => target.WriteAsync(bytes, 0, bytes.Length, ct));
        return fileMock.Object;
    }

    protected IFormFile CreateMockEmptyFile(string fileName)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(0);
        return fileMock.Object;
    }

    protected IFormFile CreateMockOversizedFile(string fileName, long length = 10 * 1024 * 1024 + 1)
    {
        var fileMock = new Mock<IFormFile>();
        fileMock.Setup(f => f.FileName).Returns(fileName);
        fileMock.Setup(f => f.Length).Returns(length);
        return fileMock.Object;
    }
}
