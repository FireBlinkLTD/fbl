# File System Plugin

File System plugin.

## Action Handler: Write to file

ID: com.fireblink.fbl.fs.file.write

Aliases:
 - fbl.fs.file.write
 - fs.file.write
 - file.write
 - \->
 
**Example:**

```yaml
->: 
  # [optional] file path, make sure parent dirs exists
  # If not provided content will be written to temporary location directory
  path: /tmp/test.txt
  
  # [optional] but required if "path" above is not provided.
  # Assign file path to "ctx" and or "secrets" context objects
  assignPathTo:
    ctx: name
    secrets: name
  
  # [required] content of the file
  content: |-
    test content
``` 
 
## Action Handler: Encrypt files
 
Encrypt files by mask with aes-256-cbc and password converted with pbkdf2 algorithm into sha512 hash.

ID: com.fireblink.fbl.fs.encrypt

Aliases:
 - fbl.fs.encrypt
 - fs.encrypt
 - encrypt
 
**Example:**

```yaml
encrypt:
  # [required] password used to encrypt files
  # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
  password: <%- secrets.password %>
  
  # [required] list of masks to find files to be encrypted
  inlude:
  - /tmp/*.*      
    
  # [optional] list of masks to exclude
  exclude:
    - /tmp/*.log
```

## Action Handler: Decrypt files

Same as above, but instead of encryption will decrypt files.

ID: com.fireblink.fbl.fs.decrypt

Aliases:
 - fbl.fs.decrypt
 - fs.decrypt
 - decrypt
 
**Example:**

```yaml
decrypt:
  # [required] password used to decrypt files
  # Warning: don't reference it directly, better place in "secrets", as in report it will be masked.    
  password: <%- secrets.password %>

  # [required] list of masks to find files to be decrypted
  inlude:
    - /tmp/*.*      

  # [optional] list of masks to exclude
  exclude:
    - /tmp/*.log    
```