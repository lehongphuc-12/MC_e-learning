
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

    // Optional C02/C03 evidence; serialized inside existing PredictionJson (no migration).
    [JsonPropertyName("clarity")]
    public SpeechClarityDto? Clarity { get; set; }

    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }

    [JsonPropertyName("predictions")]
    public Dictionary<string, double> Predictions { get; set; }
        = new();
}

public sealed class SpeechClarityDto
{
    [JsonPropertyName("model_version")]
    public string ModelVersion { get; set; } = "";
    [JsonPropertyName("score")]
    public double Score { get; set; }
    [JsonPropertyName("raw_score")]
    public double RawScore { get; set; }
    [JsonPropertyName("deployment_mode")]
    public string DeploymentMode { get; set; } = "";
    [JsonPropertyName("automatic_pass_fail")]
    public bool AutomaticPassFail { get; set; }
    [JsonPropertyName("sample_rate")]
    public int SampleRate { get; set; }
    [JsonPropertyName("duration_seconds")]
    public double DurationSeconds { get; set; }
}
