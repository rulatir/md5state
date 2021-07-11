# md5state
Like md5sum, but also optionally records (and eventually will check for) file nonexistence.

```
Usage:
    md5state [options] [--] [arguments]
    
Options:
    --
        treat subsequent arguments as files
    -
        read filelist from stdin
    -i path
        read filelist from file specified by path
    -n string
        use string as the pseudo-checksum for nonexistent files (default: "[nonexistent]")
    -N
        fail if a file doesn't exist
    -n-
        omit nonexistent files from output
    -d string
        use string as the pseudo-checksum for filelist entries that are directories
    -D
        fail if an item is a directory
    -d-
        omit directories from output (default)
    -u string
        use string as the pseudo-checksum for existing but unreadable filelist entries
    -U
        fail on unreadable files (default)
    -u-
        omit unreadable filelist entries from output
```
