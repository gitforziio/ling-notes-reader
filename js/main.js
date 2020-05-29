

var the_vue = new Vue({
    el: '#bodywrap',
    data: {
        "file_meta_list": [],
        "current_file_meta": {},
        "readonly": 1,
        "current_content": "",
        "chunks": [],
    },
    computed: {
    },
    methods: {
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
            console.log(this.current_file_meta);
            this.makeContent();
        },
        makeContent: function() {
            let reader = new FileReader();
            let that = this;
            reader.readAsText(that.current_file_meta.file, "utf-8");
            reader.onload = function(evt) {
                that.current_content = this.result;
                console.log(that.current_content);
                that.makeChunks();
            }
        },
        makeChunks: function() {
            let lines = this.current_content.split("\n");
            let chunks = [];
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
                    chunk.idx = idx;
                    if (should_update_title_idx) {current_title_idx = idx};
                    chunk.title_idx = current_title_idx;
                    chunks.push(chunk);
                    idx += 1;
                };
            };
            this.chunks = chunks;
            console.log(this.chunks);
        },
        makeCC: function(chunk_, cc_) {
            XRegExp.forEach(cc_, /【([^\|]+)\|([^】]+)】/, (match, i) => {
                // console.log(match);
                chunk_[`_${match[1]}`] = match[2];
            });
            chunk_.abs = XRegExp.replace(cc_, /【([^\|]+)\|([^】]+)】/g, '').trim();
            if (!chunk_._definition) {chunk_._definition = "";};
            if (!chunk_._phonetic) {chunk_._phonetic = "";};
            if (!chunk_._note) {chunk_._note = "";};
            if (!chunk_._audio_file) {chunk_._audio_file = "";};
            if (!chunk_._audio_range_start) {chunk_._audio_range_start = "";};
            if (!chunk_._audio_range_end) {chunk_._audio_range_end = "";};
        },
        markup: function(txt) {
            marked.setOptions({breaks: true});
            return marked(txt)
        },
    },
})


