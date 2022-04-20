class Editor {

  constructor (old_text="", new_text="", entities={}) {
    this.old_text = old_text;
    this.new_text = new_text;
    this.story_type = story_type;
    this.sentence_limits = [];
    this.active_sentence_limits = [];
    this.left = 0;
    this.right = 0;
    // this.stopwords = {"32":"space"};
    this.stopwords = [".", "?", "!"];
    this.entities = {};
    this.quill = new Quill('#editor', {
      modules: {
        toolbar: [
          [{ 'font': [] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
          // [{ header: [1, 2, 3, 4, 5, false] }],
          ['bold', 'italic', 'underline'],
          ['image', 'code-block']
        ]
      },
      scrollingContainer: '#scrolling-container',
      placeholder: 'Write your story here...',
      theme: 'snow'  // or 'bubble'
    });
    this.change = new Delta();
    if(story_type == 'user')
      this.quill.setContents(doc)
    else{
      this.quill.setText(doc)
      // update(doc)
    }

    this.install_events(this.quill);
  }

  /*
  getter, setter functions for class variables
  */
  get_old_text(){
    return this.old_text;
  }
  set_old_text(old_text){
    this.old_text = old_text;
  }
  get_new_text(){
    return this.new_text;
  }
  set_new_text(new_text){
    this.new_text = new_text;
  }
  get_entities(){
    return this.entities;
  }
  set_entities(entities){
    this.entities = entities;
  }
  set_sentence_limits(sentence_limits) {
    this.sentence_limits = sentence_limits;
  }
  get_sentence_limits() {
    return this.sentence_limits;
  }
  set_active_sentence_limits(sentence_limits) {
    this.active_sentence_limits = sentence_limits;
  }
  get_active_sentence_limits() {
    return this.active_sentence_limits;
  }
  remove_hightlight (){
    this.quill.setSelection(this.left, 0)
  }
  highlight_sentence(sentence, remove_prev_highligth=true) {
    if(remove_prev_highligth){
      this.quill.setSelection(this.left, 0)
    }
    this.left = this.new_text.length, this.right = this.new_text.length;
    if ((sentence >= 0 ) && (sentence < this.active_sentence_limits.length)){
      this.left = this.active_sentence_limits[sentence];
    }

    if((sentence + 1 >= 0 ) && (sentence + 1 < this.active_sentence_limits.length)) {
      this.right = this.active_sentence_limits[sentence + 1]
    }
    // console.log(left, right)
    // console.log(this.new_text.substr(left, right-left))
    // this.quill.formatText(this.left, this.right-this.left, 'bold', true);
    this.quill.setSelection(this.left, this.right-this.left);
  }
  update_wordcount(text){
    let len = text.split(" ").length;
    $("#wordcount").html(len)
  }
  /*
  Manipulate (add, remove) class variables
  */
  append_entity(entity,value){
    this.entities[entity] = value;
  }
  append_property_to_entity(entity,property,value){
    if(entity in this.entities)
      this.entities[entity][property] = value
  }
  install_events (quill) {
    var self = this;
    quill.on('text-change', function(delta, oldDelta, source) {
      // if (source == 'api') {
      //   console.log("An API call triggered this change.");
      // }
      if (source == 'user') {
        logs.push({type:'text change'})
        self.change = self.change.compose(delta);
        // console.log(delta)
        self.update_wordcount(quill.getText())
        delta['ops'].forEach((op, i) => {
          if ('insert' in op)
            if (self.stopwords.indexOf(op['insert']) != -1)
              update(quill.getText()) // from index.js
        });
      }
    });
    quill.on('selection-change', function(range, oldRange, source) {
      if (source == 'user') {
        if (range) {
          if (range.length == 0) {
            // console.log('User cursor is on', range.index);
          } else if (range.length < 30){
            var text = quill.getText(range.index, range.length);
            console.log('User has highlighted', text);
            let { height, width, left, top } = quill.getBounds(range.index)

            $("#custom_entity").html(text).show();
            $('#add_custom_entity').show();
            logs.push({type:'text highlighted by user'})
          }
        } else {
          console.log('Cursor not in the editor');
        }
      }
    });

    // Save periodically
    setInterval(function() {
      if (self.change.length() > 0) {
        console.log('Saving changes');

        // Send entire document
        $.ajax({
          url: '/saveContents',
          data: JSON.stringify({doc: quill.getContents(), name: $("#project_name").val()}),
          type: 'POST',
          success: function(res){
            console.log(res)
            self.change = new Delta();
          },
          error: function(error){
            console.log("error !!!!");
          }
        }); 
      }
    }, 5*1000);

    // Check for unsaved data
    window.onbeforeunload = function() {
      if (change.length() > 0) {
        return 'There are unsaved changes. Are you sure you want to leave?';
      }
}
  }
}
