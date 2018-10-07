# Execution Reporters

Execution flow can be presented in different output formats. FBL supports only 2 generic ones: json and yaml.
All other reporters should be provided as 3rd-party plugins.

**CLI examples:**

```bash
fbl \
    -o /tmp/fbl.json \
    -r json \
    sample.flow.yml   
```

```bash
fbl \
    -o /tmp/fbl.yml \
    -r yaml \
    sample.flow.yml
```

**3rd Party Reporter options:**

```bash
fbl \
    -o /tmp/fbl.3rd \
    -r 3rd.party \
    --report-option key=value \
    sample.flow.yml    
```