using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;
using MongoDB.Driver;

namespace ProCoderJi.Api.Data.Mongo;

/// <summary>Shares Data Protection keys across API restarts and replicas using the selected Mongo database.</summary>
public sealed class MongoXmlRepository(MongoPlatformDatabase database) : IXmlRepository
{
    public IReadOnlyCollection<XElement> GetAllElements() => database.Keys.Find(FilterDefinition<MongoKeyDocument>.Empty)
        .ToList().Select(key => XElement.Parse(key.Xml)).ToArray();

    public void StoreElement(XElement element, string friendlyName) => database.Keys.InsertOne(new MongoKeyDocument
    {
        Id = Guid.NewGuid().ToString("D"), FriendlyName = friendlyName, Xml = element.ToString(SaveOptions.DisableFormatting)
    });
}
