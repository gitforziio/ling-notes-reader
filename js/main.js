

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
                "working": 0,
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
            // let self = this;
        //     return self.$refs.audio ? self.$refs.audio : {"currentTime": 0};
        // },
        // audio_currentTime: function() {
            // let self = this;
        //     return self.audio.currentTime;
        // },
        // player_range_should_end: function() {
            // let self = this;
        //     return self.audio_currentTime*1000 >= self.player.range.end;
        // },
    },
    methods: {
        addEventListeners: function() {
            let self = this;
            self.$refs.audio.addEventListener('timeupdate', self.onTimeUpdate);
            self.$refs.audio.addEventListener('canplay', self._durationUpdate);
        },
        removeEventListeners: function() {
            let self = this;
            self.$refs.audio.removeEventListener('timeupdate', self.onTimeUpdate);
            self.$refs.audio.removeEventListener('canplay', self._durationUpdate);
        },
        onTimeUpdate: function() {
            let self = this;
            self.player.currentTime = self.$refs.audio.currentTime;
            if (self.player.range.working && self.player.currentTime*1000 >= self.player.range.end) {
                self.$refs.audio.pause();
                self.player.playing = 0;
                if (self.player.range.times_left > 0) {
                    self.$refs.audio.currentTime = self.player.range.start/1000;
                    self.$refs.audio.play();
                    self.player.playing = 1;
                    self.player.range.times_left -= 1;
                };
            };
        },
        onDurationUpdate: function() {
            let self = this;
            self.player.duration = self.$refs.audio.duration;
        },
        onImportAudio: function() {
            let self = this;
            let audioFileList = document.forms["audio-form"]["audio-input"].files;
            // console.log(audioFileList);
            let idx = self.audio_meta_list.length || 0;
            idx -= 1;
            for (let file of audioFileList) {
                idx += 1;
                self.audio_meta_list.push({
                    "idx": idx,
                    "name": file.name,
                    "file": file,
                    "url": URL.createObjectURL(file),
                });
            }
            self.current_audio_meta = self.audio_meta_list[idx];
            // console.log(self.current_audio_meta);
            self.player.playing = 0;
            self.$refs.audio.pause();
        },
        setMeta: function(meta) {
            let self = this;
            let au = self.audio_meta_list.filter(m => m.name == meta._au_file)[0];
            if (au) {self.current_audio_meta = au};
            let audio_start = parseInt(meta._au_start);
            let audio_end = parseInt(meta._au_end);
            if (!isNaN(audio_start) && !isNaN(audio_end)) {
                au_start = audio_start < audio_end ? audio_start : audio_end;
                au_end = audio_start > audio_end ? audio_start : audio_end;
                self.player.range.start = au_start;
                self.player.range.end = au_end;
            };
        },
        playRange: function(meta) {
            let self = this;
            self.setMeta(meta);
            self.player.range.working = 1;
            self.player.range.times_left = self.player.range.times;
            self.$refs.audio.currentTime = self.player.range.start/1000;
            self.player.range.times_left -= 1;
            self.$refs.audio.play();
            self.player.playing = 1;
        },
        playOrPause: function() {
            let self = this;
            self.player.playing = 1 - self.player.playing;
            if (self.player.playing) {
                self.$refs.audio.play();
            } else {
                self.$refs.audio.pause();
            }
        },
        jumpOut: function() {
            let self = this;
            self.player.range.working = 0;
        },
        speedUp: function() {
            let self = this;
            if (self.player.rate < 4) {self.player.rate += 0.25};
            self.$refs.audio.playbackRate = self.player.rate;
        },
        speedDown: function() {
            let self = this;
            if (self.player.rate > 0) {self.player.rate -= 0.25};
            self.$refs.audio.playbackRate = self.player.rate;
        },
        onImport: function() {
            let self = this;
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
            self.file_meta_list = file_meta_list;
            self.current_file_meta = file_meta_list[0];
            // console.log(self.current_file_meta);
            self.makeContent();
        },
        makeContent: function() {
            let self = this;
            let reader = new FileReader();
            reader.readAsText(self.current_file_meta.file, "utf-8");
            reader.onload = function(evt) {
                self.current_content = this.result;
                // console.log(self.current_content);
                self.makeChunks();
            }
        },
        makeChunks: function() {
            let self = this;
            let lines = self.current_content.split("\n");
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
                    chunk._type = "br";
                    chunk.abs = "";
                } else if (line.slice(0, 1) == "#") {
                    chunk._type = "title";
                    chunk.abs = XRegExp.replace(line, /^#+/, '').trim();
                    current_title = chunk.abs;
                    current_title_level = XRegExp.exec(line, /^#+/)[0].length;
                    should_update_title_idx = true;
                    // current_title_idx = idx;
                } else if (line.slice(0, 3) == "【音】") {
                    current_au_file = line.slice(3);
                    push_last = false;
                } else if (line.slice(0, 3) == "【词】"||line.slice(0, 3) == "【短】"||line.slice(0, 3) == "【句】") {
                    chunk._type = line.slice(1, 2);//"word";"phrase";"sentence";
                    let cc = line.slice(3);
                    self.makeCC(chunk, cc);
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
                        "_type": "plain",
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
                    if (!chunk._au_file) {chunk._au_file = current_au_file;};
                    chunk.idx = idx;
                    if (should_update_title_idx) {current_title_idx = idx};
                    chunk.title_idx = current_title_idx;
                    chunks.push(chunk);
                    idx += 1;
                };
            };
            self.chunks = chunks;
            // console.log(self.chunks);
            // self.onTestHappy();
        },
        onExport: function() {
            let self = this;
            let text_list = [];
            for (let chunk of self.chunks) {
                if (chunk._type == "br") {
                    text_list.push("");
                } else if (chunk._type == "title") {
                    text_list.push(chunk.origin);
                } else if (chunk._type == "plain") {
                    text_list.push(chunk.origin);
                } else if (chunk._type == "词"||chunk._type == "短"||chunk._type == "句") {
                    let text = `【${chunk._type}】${chunk.abs}`;
                    if (chunk._phon) {text += `【phon|${chunk._phon}】`;};
                    if (chunk._def) {text += `【def|${chunk._def.replace(/【/g, '〖').replace(/】/g, '〗')}】`;};
                    if (chunk._note) {text += `【note|${chunk._note.replace(/【/g, '〖').replace(/】/g, '〗')}】`;};
                    if (chunk._au_file) {text += `【au_file|${chunk._au_file}】`;};
                    if (!isNaN(parseInt(chunk._au_start)) && !isNaN(parseInt(chunk._au_end))) {
                        text += `【au_range|[${chunk._au_start}, ${chunk._au_end}]】`;
                    } else {
                        text += `【au_range|[xx_yy]】`;
                    };
                    text_list.push(text);
                } else {text_list.push("【???】");};
            };
            let text = text_list.join("\n");
            var file = new File([text], (self.current_file_meta.name), { type: "text/plain; charset=utf-8" });
            saveAs(file);
        },
        onTestHappy: function() {
            let self = this;
            let text_list = [];
            for (let chunk of self.chunks) {
                if (chunk._type == "br") {
                    text_list.push("");
                } else if (chunk._type == "title") {
                    text_list.push("");
                } else if (chunk._type == "plain") {
                    text_list.push("");
                } else if (chunk._type == "词"||chunk._type == "短"||chunk._type == "句") {
                    text_list.push(chunk.abs.replace(/\*/g, '').replace(/<u>|<\/u>/g, ''));
                } else {
                    text_list.push("");
                };
            };
            let text = text_list.join("\n");
            var file = new File([text], (`${self.current_file_meta.name}.abs.txt`), { type: "text/plain; charset=utf-8" });
            saveAs(file);
        },
        makeCC: function(chunk_, cc_) {
            XRegExp.forEach(cc_, /【([^\|]+)\|([^】]+)】/, (match, i) => {
                // console.log(match);
                chunk_[`_${match[1]}`] = match[2];
            });
            chunk_.abs = XRegExp.replace(cc_, /【([^\|]+)\|([^】]+)】/g, '').trim();
            if (chunk_._au_range) {
                if (chunk_._au_range != "[xx_yy]") {
                    let rg = JSON.parse(chunk_._au_range);
                    chunk_._au_start = rg[0];chunk_._au_end = rg[1];
                };
            };
            if (!chunk_._def) {chunk_._def = "";};
            if (!chunk_._phon) {chunk_._phon = "";};
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
        let self = this;
        self.addEventListeners();
    },
    beforeDestroyed() {
        let self = this;
        self.removeEventListeners();
    }
})


