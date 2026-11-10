using Microsoft.Extensions.DependencyInjection;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Tests;

public sealed class AccountStoreTests
{
    [Fact]
    public async Task Identity_uses_the_provider_subject_and_updates_the_existing_profile()
    {
        using var factory = new PlatformFactory();
        using var scope = factory.Services.CreateScope();
        var accounts = scope.ServiceProvider.GetRequiredService<IAccountStore>();
        Assert.False(await accounts.Exists(Guid.NewGuid(), default));
        var first = await accounts.SignIn("provider-subject-a", "first@example.test", "First", default);
        var updated = await accounts.SignIn("provider-subject-a", "new@example.test", "Updated", default);
        var other = await accounts.SignIn("provider-subject-b", "new@example.test", "Other", default);
        Assert.Equal(first.Id, updated.Id);
        Assert.Equal("new@example.test", updated.Email);
        Assert.Equal("Updated", updated.Name);
        Assert.NotEqual(updated.Id, other.Id);
        Assert.True(await accounts.Exists(first.Id, default));
    }

    [Fact]
    public async Task Concurrent_first_sign_ins_keep_one_internal_account()
    {
        using var factory = new PlatformFactory();
        var services = factory.Services;
        async Task<Guid> SignIn()
        {
            using var scope = services.CreateScope();
            return (await scope.ServiceProvider.GetRequiredService<IAccountStore>()
                .SignIn("same-provider-subject", "same@example.test", "Student", default)).Id;
        }
        var identities = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => SignIn()));
        Assert.Single(identities.Distinct());
    }
}
