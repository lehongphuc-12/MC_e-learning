
using System.Text.Json.Serialization;

namespace MC_BE.Features.VoiceAssessment.DTOs.Internal;

public class PronunciationAnalysisDto
{
    [JsonPropertyName("model_version")]
    public string ModelVersion { get; set; } = string.Empty;

    [JsonPropertyName("checkpoint_epoch")]
    public int CheckpointEpoch { get; set; }

    [JsonPropertyName("sample_rate")]
    public int SampleRate { get; set; }

    [JsonPropertyName("duration_seconds")]
    public double DurationSeconds { get; set; }

    [JsonPropertyName("inference_time_ms")]
    public double InferenceTimeMs { get; set; }

    [JsonPropertyName("predictions")]
    public Dictionary<string, double> Predictions { get; set; }
        = new();
}
