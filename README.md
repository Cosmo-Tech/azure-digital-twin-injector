# dt-injector - Digital Twin Injection Pipeline

dt-injector is an Azure Function App to inject twins and relations into an
Azure Digital Twin instance from CSV files. It simplifies feeding data into a
digital twin for instance as a last step from an ETL.

The process is split across four functions. The first function, `csv2json`
reads the input csv and generates a json strings suitable for ingestion by
Azure Digital Twin for each line of the input file and posts them to an Azure
Queue Storage. The second function, `doUpsert`, processes json items from the
queue and upserts (i.e. insert or update) twins and relations into the
digital twin. The last two function, `blobwatcher` and `insertcsv` are
frontends for csv2json (respectively blob triggered and http triggered).

# CSV input format

The injector is triggered by uploading a CSV file to an azure storage
container and expects the following columns for twins:
 - `$metadata.$model`: The model id of the twin,
 - `$id`: The id of the twin,
 - one column for each property or telemetry, with complex properties
   flattened with dot-spearated headers.
for instance given the following twin model:
```json
{
    "@id": "dtmi:com.example:flagpole;1",
    "@type": "Interface",
    "contents":  [
        {
            "@type": "Property",
            "name": "color",
            "schema": "string"
        },
        {
            "@type": "Property",
            "name": "position",
            "schema": {
                "@type": "Object",
                "fields": [
                    {
                        "name": "x",
                        "schema": "double"
                    },
                    {
                        "name": "y",
                        "schema": "double"
                    }
                ]
            }
        }
    ]
}
```

you may inject twins matching this model using the following CSV file:

| `"$metadata.$model"`          | `"$id"`        | `"color"` | `"position.x"` | `"position.y"` |
| ----------------------------- | -------------- | --------- | -------------- | -------------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"red"`   | `25.3`         | `42.0`         |

To insert relation `dt-injestor` expects the folowing columns:

| `"$sourceId"` | `"$targetId"` | `"$relationshipId"` | `"$relationshipName"` | `"property1"` | `"property..."` |
| ------------- | ------------- | ------------------- | --------------------- | ------------- | --------------- |

# Configuration

dt-injector canbe configured using the following settings:

| **Application settings**       |                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| WATCHED_CSV_STORAGE_CONNECTION | shared access key for the storage account beingwatched for new csv files                            |
| WATCHED_CSV_STORAGE_CONTAINER  | name of the container to monitor for new csv                                                        |
| CSV_STORAGE_CONNECTION         | shared access key for the storage account hosting the input csv file container for the http trigger |
| CSV_STORAGE_CONTAINER          | name of the container where new csv are read by the http trigger                                    |
| JSON_STORAGE_CONNECTION        | shared access key for the storage account hosting the input csv file container                      |
| JSON_STORAGE_QUEUE             | name of the queue linking the two functions                                                         |
| DIGITAL_TWIN_URL               | https://digitaltwin24876.api.weu.digitaltwins.azure.net                                             |


an example `local.settings.json` is provided in the repository. In addition,
The Function App [managed
idendity](https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity?tabs=javascript)
must be assigned the role of `Azure Digital Twins Data Owner` in the target
digital twin.

# Known Limitations

Azure Digital Twin API is currently rate limited to 50 create/delete
operations pers second and 10 create/update/delete per second on a single
twin or its relations (See [Service Limits - Azure Digital
Twins](https://docs.microsoft.com/en-us/azure/digital-twins/reference-service-limits)).
The function app is throttled to enforce these limitations, it is also
required to turn off the [scale-out of the Function
App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale).
These quotas limits the injection to at most 600 relations or 3,000 twins per minutes.