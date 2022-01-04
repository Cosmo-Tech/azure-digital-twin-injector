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

The injector is triggered by uploading a CSV file to an azure storage
container and expects the following columns for twins:
 - `$metadata.$model`: The model id of the twin;
 - `$id`: The id of the twin;
 - `$entityDelete`: If true, the twin is deleted with all its in & out relationships, if false the twin is upserted; Optional. Default: false
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

You may inject twins matching this model using the following CSV file:

| `"$metadata.$model"`          | `"$id"`        | `"$entityDelete"` | `"color"` | `"position"`                   |
| ----------------------------- | -------------- | ----------------- | --------- | ------------------------------ |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"false"`         | `"red"`   | `"{""x"": 25.3, ""y"": 42.0}"` |

Alternatively, the values `"position/x"` and `"position/y"` can be injected
individually using their complete path as a column name:

| `"$metadata.$model"`          | `"$id"`        | `"$entityDelete"` | `"color"` | `"position/x"` | `"position/y"` |
| ----------------------------- | -------------- | ----------------- | --------- | -------------- | -------------- |
| `dtmi:com.example:flagpole;1` | `"first_pole"` | `"false"`         | `"red"`   | `25.3`         | `42.0`         |

Note: this alternative syntax **does not work if target property is empty**.
For instance, the example above will fail if the property `"position"` is
empty.

Inserting relationships with `dt-injector` requires the following columns:

| `"$sourceId"` | `"$targetId"` | `"$relationshipId"` | `"$relationshipName"` | `"$relationshipDelete"` | `"property1"` | `"property..."` |
| ------------- | ------------- | ------------------- | --------------------- | ----------------------- | ------------- | --------------- |

# Configuration

dt-injector can be configured using the following settings:

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
