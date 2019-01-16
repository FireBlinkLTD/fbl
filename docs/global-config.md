# Global Config

FBL upon launch will try to look for `${FBL_HOME}/config` to read default configuration.

If `FBL_HOME` environment variable is not provided it will match `.fbl` folder inside user's HOME directory.

## Config file format

```yaml
# [optional] list of plugins to automatically load upon launch of the flow
plugins:
  - '@fbl-plugin/http'

# [optional] Default context values
context: {
  # [optional]
  ctx:
    test: 123

  # [optional]
  secrets:
    password: XXXXX

  # [optional]
  parameters:
    var: true

# [optional] reporting configuration
report:
  # [optional] output path for report
  output: /tmp/report.json
  # [optional] report format type
  type: json
  # [optional] custom reporting options
  options:

# [optional] additional request configuration for case when flow path is provided as URL
http:
  # [optional] additional HTTP headers to send with GET request
  headers:
    Authorization: Bearer XXXXX

# [optional] other options
other:
  # [optional] disable plugin version compatibility check
  allowUnsafePlugins: true

  # [optional] disable flow requirements compatibility check
  allowUnsafeFlows: true

  # [optional] enable remove flow caching
  # Note: cache hits by URL, if remote flow changes cached might be outdated and should be cleaned manually, so use this option with caution
  useCache: true

  # [optional] disable colorful output
  noColors: true

  # [optional] override default global EJS template delimiter
  # Default value: $
  globalTemplateDelimiter: '$'

  # [optional] override default local EJS template delimiter
  # Default value: %
  localTemplateDelimiter: '%'
```
