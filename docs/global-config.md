# Global Config

FBL upon launch will try to look for `${FBL_HOME}/config` to read default configuration. 

If `FBL_HOME` environment variable is not provided it will match `.fbl` folder inside user's HOME directory.

## Config format


```yaml
# Provide a list of globally installed plugins or absolute paths
# Has same effect as "-p" option.
plugins:
  - fbl-plugin-name
  - /home/user/test/fbl-plugins/fbl-plugin-name
  
# Provide list of context key=value pairs
# Has same effect as "-c" option.
# Note: if you will provide just a key you will get prompted to provide a value each time you invoke the "fbl" cli
context:
  - key=value

# Provide list of secrets key=value pairs
# Has same effect as "-s" option.
# Note: if you will provide just a key you will get prompted to provide a value each time you invoke the "fbl" cli
secrets:
  - key=value

# Disable console colorful output
# Has same effect as "--no-colors" option
no-colors: true

# Custom global EJS template delimiter
global-template-delimiter: $

# Custom local EJS template delimiter
local-template-delimiter: %
```