# Tarball (packaging)

Packaging of flows is possible inside tarball.

Requirements:
- File name should end with `.tar.gz`
- In root of the tarball `index.yml` should exist that represents the enty point of it.

## Reference tarball

You can reference tarball as any other flow by just providing path to it, e.g.:

`fbl path/to/flow.tar.gz`

or inside the flow:

```yaml
version: 1.0.0
pipeline:
  '--':
    # reference the flow stored locally
    - @: path/to/flow.tar.gz
    # reference the flow stored remotely
    - @: http://storage.com/another_flow.tar.gz
```

## Tarball creation (Unix)

Let's assume your flow folder is located under the path `~/flows/sample`

To create a valid tarball do the following in you terminal

```bash
# navigate to the parent directory (~/flows)
cd ~/flows
# create the tarball
tar czf sample.tar.gz sample
```

