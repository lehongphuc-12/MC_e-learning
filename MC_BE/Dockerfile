# =======================================================
# 1. Build Stage (.NET 9 SDK)
# =======================================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy file .csproj va restore packages truoc de tan dung layer cache
COPY MC_BE.csproj ./
RUN dotnet restore "MC_BE.csproj"

# Copy toan bo source code va tien hanh publish
COPY . .
RUN dotnet publish "MC_BE.csproj" -c Release -o /app/publish /p:UseAppHost=false

# =======================================================
# 2. Runtime Stage (.NET 9 ASP.NET + FFmpeg)
# =======================================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Cai dat FFmpeg (cho AudioExtractorService) va curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy build artifacts tu build stage
COPY --from=build /app/publish .

# Port mac dinh cua .NET 9 trong container la 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "MC_BE.dll"]
