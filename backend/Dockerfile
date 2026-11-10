# Build from the repository root: docker build -f backend/Dockerfile .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY global.json ./
COPY backend/src/ProCoderJi.Api/ProCoderJi.Api.csproj backend/src/ProCoderJi.Api/packages.lock.json backend/src/ProCoderJi.Api/
RUN dotnet restore backend/src/ProCoderJi.Api/ProCoderJi.Api.csproj --locked-mode

COPY backend/src/ProCoderJi.Api/ backend/src/ProCoderJi.Api/
COPY shared/ shared/
RUN dotnet publish backend/src/ProCoderJi.Api/ProCoderJi.Api.csproj \
    --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=build --chown=app:app /app/publish ./
USER $APP_UID
ENTRYPOINT ["dotnet", "ProCoderJi.Api.dll"]
