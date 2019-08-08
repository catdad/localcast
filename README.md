# localcast

This is a small personal project that I use to send videos from my home server to my chromecast. If you are really adventurous, feel free to check out the code and get it running for yourself.

You will need to add a JSON config file at `server/config.json`. Mine looks like this:

```json
{
    "port" : 8999,
    "root" : "D:\\Video\\TV",
    "virtuals" : [
        { "name" : "Frank", "directory" : "G:\\Video" },
        { "name" : "Public", "directory" : "H:\\Public"},
        { "name" : "Archive", "directory" : "H:\\Video\\TV Archive"}
    ]
}
```

Then, you will need node. I developed this with node 4, and currently run node 10.

```bash
npm install
npm run dev
```

This will start the server and print out a message like this:

```bash
listening at 192.168.1.100:8999
```

You can then go to this URL on any device on your network (try it on your phone from the couch, it's great). The UI should be self-explanatory (if you are adventurous and willing to just click buttons without a tutorial).

Also, and I can't stress this enough, **use at your own risk**.
