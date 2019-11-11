# File System Plugin

File System plugin.

## Action Handler: Write to file

**ID:** `com.fireblink.fbl.fs.file.write`

**Aliases:**

- `fbl.fs.file.write`
- `fs.file.write`
- `file.write`
- `->`

**Example 1: Define File Content Inline**

```yaml
->:
  # [optional] file path, if not provided content will be written to temporary location directory.
  # Note: all missing parent directories will be automatically created
  path: /tmp/test.txt

  # [optional]
  # Note: required if "path" (above) and "assignPathTo" (below) is not provided.
  assignPathTo: # follows common assign logic practicies https://fbl.fireblink.com/plugins/common#assign-to

  # [optional]
  # Note: required if "path" and "assignPathTo" (above) is not provided
  pushPathTo: # follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to

  # [required] content of the file
  content: |-
    test content
```

**Example 2: Define File Content From Other File**

```yaml
->:
  # [optional] file path, if not provided content will be written to temporary location directory.
  # Note: all missing parent directories will be automatically created
  path: /tmp/test.txt

  # [optional]
  # Note: required if "path" (above) and "assignPathTo" (below) is not provided.
  assignPathTo: # follows common assign logic practicies https://fbl.fireblink.com/plugins/common#push-to

  # [optional]
  # Note: required if "path" and "assignPathTo" (above) is not provided
  pushPathTo: # follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to

  # [required] template file
  # Note: global and then local EJS template processing will be applied to the template before writing
  contentFromFile: /tmp/template.ejs
```

## Action Handler: Create Directories

Create directory \(and all parent ones if missing\).

**ID:** `com.fireblink.fbl.fs.dir.create`

**Aliases:**

- `fbl.fs.dir.create`
- `fs.dir.create`
- `dir.create`
- `mkdir -p`
- `mkdir`

**Example:**

```yaml
# create "child" directory
# if "parent" is missing it will be also created
mkdir: /tmp/parent/child
```

## Action Handler: Remove File or Folder

Removes file or folder for given path.

**ID:** `com.fireblink.fbl.fs.remove`

**Aliases:**

- `fbl.fs.remove`
- `fbl.fs.rm`
- `fs.remove`
- `fs.rm`
- `rm -rf`
- `remove`
- `rm`

```yaml
# remove "child"
rm: /tmp/parent/child
```

## Action Handler: Move File or Folder

Allows to move/rename file or entire folder.

**ID:** `com.fireblink.fbl.fs.move`

**Aliases:**

- `fbl.fs.move`
- `fbl.fs.mv`
- `fs.move`
- `fs.mv`
- `move`
- `mv`

**Example 1: Move file to other folder**

```yaml
mv:
  # move file.txt
  from: /tmp/source/file.txt

  # to "target" folder
  # note: slash in the end is required if you want to specify a target folder
  to: /tmp/target/
```

**Example 2: Move file to other folder and rename it**

```yaml
mv:
  # move file.txt
  from: /tmp/source/file.txt

  # to "target" folder and rename it to "renamed.txt"
  to: /tmp/target/renamed.txt
```

**Example 3: Move folder contents to other folder**

```yaml
mv:
  # move everything from "source" folder
  # note: slash in the end is required if you want to move folder contents rather then the folder itself
  from: /tmp/source/

  # to "target"
  to: /tmp/target
```

## Action Handler: Copy File or Folder

Allows to copy file or entire folder.

**ID:** `com.fireblink.fbl.fs.copy`

**Aliases:**

- `fbl.fs.copy`
- `fbl.fs.cp`
- `fs.copy`
- `fs.cp`
- `copy`
- `cp`

**Example 1: Copy file to other folder**

```yaml
cp:
  # copy file.txt
  from: /tmp/source/file.txt

  # to "target" folder
  # note: slash in the end is required if you want to specify a target folder
  to: /tmp/target/
```

**Example 2: Copy file to other folder with different name**

```yaml
cp:
  # copy file.txt
  from: /tmp/source/file.txt

  # to "target" folder and name it "renamed.txt"
  to: /tmp/target/renamed.txt
```

**Example 3: Copy folder contents to other folder**

```yaml
cp:
  # copy everything from "source" folder
  # note: slash in the end is required if you want to copy folder contents rather then the folder itself
  from: /tmp/source/

  # to "target"
  to: /tmp/target
```

## Action Handler: Find files

Find files by mask.

**ID:** `com.fireblink.fbl.fs.find`

**Aliases:**

- `fbl.fs.find`
- `fs.find`
- `find`

**Example:**

```yaml
find:
  # [required] list of masks to find files
  include:
    - /tmp/**/*.txt

  # [optional] list of masks to exclude
  exclude:
    - /tmp/**/*.tmp.txt

  # [required] result storage configuration
  result:
    # [optional] if provided all paths will be relative to give base directory
    baseDir: /tmp

    # [optional]
    # Note: either `assignTo` or `pushTo` is requred
    assignTo: # follows common assign logic practicies https://fbl.fireblink.com/plugins/common#push-to

    # [optional]
    # Note: either `assignTo` or `pushTo` is requred
    pushTo: # follows common push logic practicies https://fbl.fireblink.com/plugins/common#push-to
```
