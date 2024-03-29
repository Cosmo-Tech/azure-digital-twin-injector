# dt-injector - Digital Twin CSV Injection

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2FCosmo-Tech%2Fazure-digital-twin-injector%2Fmain%2Fdeploy%2Fazuredeploy.json)
AFTER DEPLOYING YOU MUST SET THE AZURE FUNCTION AS 'AZURE DIGITAL TWINS DATA OWNER' OF THE ADT YOU WANT TO HANDLE

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

# Change log
## 0.0.2
* No more batch window to send messages to Queue
  => use nodejs https max sockets & disable Queue client keep alive
## 0.0.1
* send Azure storage queue messages by batch and wait to avoid max outbound connections
* handle papaparse error & complete callbacks
* use context for logs + multple logs added to send to log analytics
* default log level is warning
* handles empty line in csv returned by parser
* promisify setTimeout to respect batchSize correctly
* throw exceptions for CSV parsing errors or send to queue errors
* throw exceptions for twins or relationships upsert errors
  => message put in poison queue
  => Exception easy to find with Application Insights or Log Analytics
* LOG_DETAILS env var to debug CSV parsing
* MIT License
* JSDoc
* eslint config + coding style aligned
* Add documentation in this README on how to troubleshoot Azure Functions

# CSV input format

The injector is triggered by uploading a CSV file to an Azure storage
container. CSV files must comply with the following naming convention:
`<filename>.v<version_number>.csv` (for instance: `my_twins.v2.csv`).

In order to illustrate file syntax we consider the following example twin
model:
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
        },
        {
            "@type": "Relationship",
            "name": "neighbor",
            "target": "dtmi:com.example:flagpole;1",
            "properties": [
                {
                    "type": "Property",
                    "name": "distance",
                    "schema": "double"
                }
            ]
        }
    ]
}
```

## Twin upsert file syntax

The following columns are **mandatory** in files describing twin insertions or
updates:
- `$metadata.$model`: model identifier of the twin;
- `$id`: identifier of the twin.

The following columns are **optional** in files describing twin insertions or
updates:
- `$entityDelete`: if true, the twin is deleted with all its inbound and
  outbound relationships. If false the twin is upserted. Default: false.
- One column for each property or telemetry, with complex properties
  flattened with `.` or `/` separated headers (see below).

### Example 1 - Inserting a twin with a simple property

You may inject twins following the example model above using the following CSV
file:

| `"$metadata.$model"`          | `"$id"`        | `"color"` |
| ----------------------------- | -------------- | --------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"red"`   |

### Example 2 - Adding a complex property to the twin

In example 1 no `position` property was created; it can be added using the
following CSV file:

| `"$metadata.$model"`          | `"$id"`        | `"position"`                   |
| ----------------------------- | -------------- | ------------------------------ |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"{""x"": 25.3, ""y"": 42.0}"` |

Note that the value of the `color` property will not change: since the
`first_pole` twin already exists, the line is interpreted as an update query.

Alternatively, the following syntax could have been used with the same result:

| `"$metadata.$model"`          | `"$id"`        | `"position.x"` | `"position.y"` |
| ----------------------------- | -------------- | -------------- | -------------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `25.3`         | `42.0`         |

### Example 3 - Updating a complex property of a twin

Syntax described in example 2 cannot be used to change a single value of a
complex property. To do so, you need to express the complete path of the value
to be changed using `/` (instead of a `.`) as a separator in the column name:

| `"$metadata.$model"`          | `"$id"`        | `"position/x"` |
| ----------------------------- | -------------- | -------------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `44.9`         |

This example updates the value of `position.x` without changing the value of
`position.y`.

Note: this syntax **does not work if target property does not exist** in target
twin. The property needs to exist (and can be created using the syntax
described in example 2).

### Example 4 - Deleting a twin

| `"$metadata.$model"`          | `"$id"`        | `"$entityDelete"` |
| ----------------------------- | -------------- | ----------------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"true"`          |

Note: additional properties on a line where the property `$entityDelete` is
`true` are ignored.

## Relationship upsert file syntax

The following columns are **mandatory** in files describing relationship
insertions or updates:
- `$sourceId`: identifier of the source twin of the relationship;
- `$targetId`: identifier of the target twin of the relationship.

The following columns are **optional** in files describing twin insertions or
updates:
- `$relationshipId`: identifier of the relationship. If no `$relationshipId`
  value is provided, an identifier is created by concatenation:
  `<$sourceId>-<$targetId>`.
- `$relationshipName`: name of the relationship. If no `$relationshipName`
  value is provided, the CSV file name is used instead.
- `$relationshipDelete`: if true, the relationship is deleted. If false it is
  upserted. Default: false.
- One column for each property or telemetry, with complex properties
  flattened with `.` separated headers (for insertions) or `/` separated
  headers (for updates).

Relationship insertion or update follows the same rules than twins. For
instance, inserting a new relationship with a simple property value can be
achieved with the following CSV file structure:

| `"$sourceId"`  | `"$targetId"`   | `"$relationshipId"` | `"distance"` |
| -------------- | --------------- | ------------------- | ------------ |
| `"first_pole"` | `"second_pole"` | `"pole_1-2"`        | `53.0`       |

# Configuration

`dt-injector` can be configured using the following settings:

| **Application settings**       |                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| WATCHED_CSV_STORAGE_CONNECTION | connection string for the storage account being watched for new csv files                           |
| WATCHED_CSV_STORAGE_CONTAINER  | name of the container to monitor for new csv                                                        |
| CSV_STORAGE_CONNECTION         | connection string for the storage account hosting the input csv file container for the http trigger |
| CSV_STORAGE_CONTAINER          | name of the container where new csv are read by the http trigger                                    |
| JSON_STORAGE_CONNECTION        | connection string for the storage account hosting the input csv file container                      |
| JSON_STORAGE_QUEUE             | name of the queue linking the two functions                                                         |
| DIGITAL_TWINS_URL              | https://digitaltwin24876.api.weu.digitaltwins.azure.net                                             |


An example `local.settings.json` is provided in the repository. In addition,
The Function App [managed
idendity](https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity?tabs=javascript)
must be assigned the role of `Azure Digital Twins Data Owner` in the target
digital twin.

# Example Azure Data Factory to Azure Digital Twin pipeline

See [Getting started with data injection](https://github.com/Cosmo-Tech/getting-started-with-data-injection) for a complete example.

# Known Limitations

Azure Digital Twin API is currently rate limited to 50 create/delete
operations pers second and 10 create/update/delete per second on a single
twin or its relations (See [Service Limits - Azure Digital
Twins](https://docs.microsoft.com/en-us/azure/digital-twins/reference-service-limits)).
The function app is throttled to enforce these limitations, it is also
required to turn off the [scale-out of the Function
App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale).
These quotas limits the injection to at most 600 relations or 3,000 twins per minutes.

# Debug & troubleshooting
## Azure
Enable Application Insights and eventually Log Analytics.
### Log stream
Open your Function App and open 'Log stream'.
Stay on Filesystem Logs.
Note: you can connect to Log stream in CLI as explained later.
By default the function app is configured with Warning level to avoid to much messages.
Edit host.json to change the log level if needed and republish the function.
### Poison Queue
If there is are 5 consecutive errors during a Queue message handling (doUpsert) of json-queue, the message is put in poison queue.
You can retrieve the failed message in the json-queue-poison Queue.
### Application Insights
Open Application Insights and go to 'Transaction Search'.
Click on See All Data and filter Event Types on Exception only.
Click on the exception title to display the message.
### Log Analytics
Open your Log Analytics Workspace and open 'Logs'.
Run this kusto query to get last exceptions with their message:
``` kusto
FunctionAppLogs
| where Level == "Error"
| project TimeGenerated, HostInstanceId, Level, ExceptionMessage, Message, _ResourceId
| sort by TimeGenerated desc
```
## local debug
Pre-requisites:
* [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
* [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=linux%2Ccsharp%2Cportal%2Cbash%2Ckeda)
### Host locally
``` batch
az login
func azure functionapp fetch-app-settings FUNCTION_APP_NAME
func start
```
To run only one function use `func start --functions LIST,OF,FUNCTIONS`
[Functions Core Tools Reference](https://docs.microsoft.com/en-us/azure/azure-functions/functions-core-tools-reference?tabs=v2)
### Connect to Azure Functions log stream
``` batch
az login
func azure functionapp logstream FUNCTION_APP_NAME
```
### Debug
[Microsoft documentation](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#local-debugging)
