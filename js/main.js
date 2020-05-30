

var the_vue = new Vue({
    el: '#bodywrap',
    data: {
        "audio_meta_list": [],
        "current_audio_meta": {},
        "player": {
            "playing": 0,
            "loop": 0,
            "rate": 1,
            "current_time": 0,
            "duration": 0,
            "min": 0,
            "max": 0,
            "range": {
                "working": 1,
                "start": 0,
                "end": 1000,
                "times": 1,
                "times_left": 1,
            },
        },
        "file_meta_list": [],
        "current_file_meta": {},
        "readonly": 1,
        "current_content": "",
        "chunks": [],
    },
    computed: {
        // audio: function() {
        //     return document.getElementById(`audio`) ? document.getElementById(`audio`) : {"currentTime": 0};
        // },
        // audio_currentTime: function() {
        //     return this.audio.currentTime;
        // },
        // player_range_should_end: function() {
        //     return this.audio_currentTime*1000 >= this.player.range.end;
        // },
    },
    methods: {
        addEventListeners: function () {
            let self = this;
            self.$refs.audio.addEventListener('timeupdate', self.onTimeUpdate);
            self.$refs.audio.addEventListener('canplay', self._durationUpdate);
        },
        removeEventListeners: function () {
            let self = this;
            self.$refs.audio.removeEventListener('timeupdate', self.onTimeUpdate);
            self.$refs.audio.removeEventListener('canplay', self._durationUpdate);
        },
        onTimeUpdate: function () {
            let self = this;
            self.player.currentTime = self.$refs.audio.currentTime;
            if (self.player.range.working && self.player.currentTime*1000 >= self.player.range.end) {
                self.$refs.audio.pause();
                self.player.playing = 0;
            };
        },
        onDurationUpdate: function () {
            let self = this;
            self.player.duration = self.$refs.audio.duration;
        },
        onImportAudio: function() {
            let audioFileList = document.forms["audio-form"]["audio-input"].files;
            // console.log(audioFileList);
            let audio_meta_list = [];
            let idx = 0;
            for (let file of audioFileList) {
                audio_meta_list.push({
                    "idx": idx,
                    "name": file.name,
                    "file": file,
                    "url": URL.createObjectURL(file),
                });
                idx += 1;
            }
            this.audio_meta_list = audio_meta_list;
            this.current_audio_meta = audio_meta_list[0];
            // console.log(this.current_audio_meta);
        },
        setMeta: function(meta) {
            console.log(meta);
            let au = this.audio_meta_list.filter(m => m.name == meta._au_file)[0];
            if (au) {this.current_audio_meta = au};
            if (meta._au_start + meta._au_end) {
                au_start = Math.min(meta._au_start, meta._au_end);
                au_end = Math.max(meta._au_start, meta._au_end);
                this.player.range.start = au_start;
                this.player.range.start = au_end;
            };
        },
        playRange: function(meta) {
            this.setMeta(meta);
            this.$refs.audio.currentTime = this.player.range.start/1000;
            this.$refs.audio.play();
            this.player.playing = 1;
        },
        playOrPause: function() {
            this.player.playing = 1 - this.player.playing;
            if (this.player.playing) {
                this.$refs.audio.play();
            } else {
                this.$refs.audio.pause();
            }
        },
        speedUp: function() {
            let it = this.player.rate;
            if (it < 4) {it += 0.25};
            document.getElementById(`audio`).playbackRate = it;
        },
        speedDown: function() {
            let it = this.player.rate;
            if (it > 0) {it -= 0.25};
            document.getElementById(`audio`).playbackRate = it;
        },
        onImport: function() {
            let fileList = document.forms["file-form"]["file-input"].files;
            // console.log(fileList);
            let file_meta_list = [];
            let idx = 0;
            for (let file of fileList) {
                file_meta_list.push({
                    "idx": idx,
                    "name": file.name,
                    "file": file,
                    "url": URL.createObjectURL(file),
                    "content": "",
                });
                idx += 1;
            }
            this.file_meta_list = file_meta_list;
            this.current_file_meta = file_meta_list[0];
            // console.log(this.current_file_meta);
            this.makeContent();
        },
        makeContent: function() {
            let reader = new FileReader();
            let that = this;
            reader.readAsText(that.current_file_meta.file, "utf-8");
            reader.onload = function(evt) {
                that.current_content = this.result;
                // console.log(that.current_content);
                that.makeChunks();
            }
        },
        makeChunks: function() {
            let lines = this.current_content.split("\n");
            let chunks = [];
            let current_au_file = "";
            let current_title = "";
            let current_title_level = 1;
            let should_update_title_idx = false;
            let current_title_idx = -1;
            let last_content = ""
            let idx = 0;
            for (let line of lines) {
                let push_last = true;
                let chunk = {};
                chunk.origin = line;
                if (line == "") {
                    chunk.kind = "br";
                    chunk.abs = "";
                } else if (line.slice(0, 3) == "【音】") {
                    current_au_file = line.slice(3);
                    push_last = false;
                } else if (line.slice(0, 3) == "【词】") {
                    chunk.kind = "word";
                    let cc = line.slice(3);
                    this.makeCC(chunk, cc);
                } else if (line.slice(0, 3) == "【短】") {
                    chunk.kind = "phrase";
                    let cc = line.slice(3);
                    this.makeCC(chunk, cc);
                } else if (line.slice(0, 3) == "【句】") {
                    chunk.kind = "sentence";
                    let cc = line.slice(3);
                    this.makeCC(chunk, cc);
                } else if (line.slice(0, 1) == "#") {
                    chunk.kind = "title";
                    chunk.abs = XRegExp.replace(line, /^#+/, '').trim();
                    current_title = chunk.abs;
                    current_title_level = XRegExp.exec(line, /^#+/)[0].length;
                    should_update_title_idx = true;
                    // current_title_idx = idx;
                } else {
                    if (last_content) {
                        last_content = `${last_content}\n${line}`
                    } else {
                        last_content = `${line}`
                    };
                    push_last = false;
                };
                chunk.title = current_title;
                chunk.title_level = current_title_level;
                if (push_last && last_content) {
                    chunks.push({
                        "kind": "plain",
                        "origin": last_content,
                        "abs": last_content,
                        "title": current_title,
                        "title_level": current_title_level,
                        "title_idx": current_title_idx,
                        "idx": idx,
                    });
                    idx += 1;
                    last_content = "";
                };
                if (push_last) {
                    chunk._au_file = current_au_file;
                    chunk.idx = idx;
                    if (should_update_title_idx) {current_title_idx = idx};
                    chunk.title_idx = current_title_idx;
                    chunks.push(chunk);
                    idx += 1;
                };
            };
            this.chunks = chunks;
            // console.log(this.chunks);
        },
        makeCC: function(chunk_, cc_) {
            XRegExp.forEach(cc_, /【([^\|]+)\|([^】]+)】/, (match, i) => {
                // console.log(match);
                chunk_[`_${match[1]}`] = match[2];
            });
            chunk_.abs = XRegExp.replace(cc_, /【([^\|]+)\|([^】]+)】/g, '').trim();
            if (!chunk_._def) {chunk_._def = "";};
            if (!chunk_._phonetic) {chunk_._phonetic = "";};
            if (!chunk_._note) {chunk_._note = "";};
            if (!chunk_._au_file) {chunk_._au_file = "";};
            if (!chunk_._au_start) {chunk_._au_start = "";};
            if (!chunk_._au_end) {chunk_._au_end = "";};
        },
        markup: function(txt) {
            marked.setOptions({breaks: true});
            return marked(txt)
        },
    },
    mounted() {
        this.addEventListeners()
    },
    beforeDestroyed() {
        this.removeEventListeners()
    }
})


