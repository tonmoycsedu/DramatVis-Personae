class Character {
  constructor() {
    /*
    Constructor for the class.
    */
    // var self = this;
    this.characters = [];
    this.character_dict = {};
    this.alias_dict = {};
    this.user_defined = [];
  }

  trim_selector (selector) {
    selector = selector.toLowerCase().replace(/ /g, '')
    selector = selector.replace('.', '')
    return selector
  }

  alert_box_success (person) {
    const html_string = 
      '<div class="alert alert-success" fade show>'+
        '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>'+
        'We have detected a new character <strong id="person_name">'+person+'</strong>'+
        ' in your story.'+
        ' Click anywhere to confirm!'+
      '</div>';
    
      return html_string;
  }

  character_div (character) {
    /*
    create a character div
    1. a label with character name
    2. a drodown with demographic options
    */
    // console.log(this.characters)

    let character_name = character['name']
    let person =  character['trimmed_name']

    let html_string = 
      '<div id="characterdiv_'+person+'" original_name="'+character_name+'" class="character_div item">'+
        '<span id="span_'+person+'">'+
          '<div class="ui '+ CONFIG.default_character_color +' large horizontal label">' +
            character_name +
          '</div>'+
        '</span>';

    if ('demographics' in character) {
      for (let k in character['demographics']) {
        let v = character['demographics'][k];
        html_string += '<div label_character=' + character['trimmed_name'] +
          ' label_identity=' + k + ' label_category=' + v + ' class="ui label">' + v + '</div>'
      }
    }

    html_string +=
      '</div>';
    
    return html_string;
  }

  list_NER (characters) {

    let character_html = ""

    for (let i = 0; i < characters.length; i++){
      let character = characters[i]
      if (!(character['name'] in this.character_dict) || (this.character_dict[character['name']] == CONFIG['character_state']['removed'])){

        this.characters.push(character)
        this.character_dict[character['name']] = CONFIG['character_state']['active'];

        character_html += this.character_div(character)
      }
    }
    $("#person_list").append(character_html)

    this.install_events();
    console.log(this.characters, this.character_dict);
  }

  install_events() {
    let self = this;

    $('.ui.accordion')
      .accordion();

    $('.ui.dropdown.demographics')
      .dropdown({
        selectOnKeydown: false,
        onChange: function(value, text, $selectedItem) {
          
          let character_name = $selectedItem.attr('character');
          let identity = $selectedItem.attr('identity');
          let category = text;

          let obj = self.characters.find(c => c.trimmed_name == character_name);

          if(identity in obj) {
            $('div[label_character='+obj['trimmed_name']+'][label_identity='+identity+']').html(category+ ' <i class="category close icon"></i>')  
          } else {
            $(this).closest('div.item').append('<div label_character='+obj['trimmed_name']+
              ' label_identity='+identity+' label_category='+category+' class="ui label">'+category+' <i class="category close icon"></i> </div>')
          }
          obj[identity] = category
          obj.demographics[identity] = category
          console.log(self.characters)
          VIZ.update_timeline();
          logs.push({type:'add identity'})
        }
      });

    $(".character_div").draggable();

    $('.character_div').droppable({
        drop: function(event, ui) {
          let main_character = $(event.target).attr("id").split("_")[1];
          let alias = ui.draggable.attr("id").split("_")[1];
          console.log(self.characters, main_character, alias)
          let obj = self.characters.find(c => c.trimmed_name == main_character);
          let alias_obj = self.characters.find(c => c.trimmed_name == alias);

          self.alias_dict[alias_obj.name] = obj.name; 
          $("#span_"+obj['trimmed_name']).append('<div class="ui teal large horizontal label">' +alias_obj.name +'<i class="delete icon"></i>')

          if("alias" in obj) {
            obj["alias"].push(alias_obj.name)
          } else {
            obj["alias"] = [alias_obj.name]
          }

          if("alias" in alias_obj){
            alias_obj['alias'].forEach(function(a){
              if("alias" in obj) {
                obj["alias"].push(a)
              } else {
                obj["alias"] = [a]
              }
              self.alias_dict[a] = obj.name; 
              $("#span_"+obj['trimmed_name']).append('<div class="ui teal large horizontal label">' +a +'<i class="delete icon"></i>')
            })
          }

          let index = self.characters.findIndex(c => c.trimmed_name == alias)
          self.characters.splice(index,1);

          let sel_index = VIZ.selected_labels.indexOf(alias_obj.name)
          if(sel_index != -1) {
            VIZ.selected_labels.splice(sel_index, 1)
          }
          ui.draggable.remove();
          VIZ.update_timeline();
          VIZ.update_wordcloud(VIZ.selected_labels)
          VIZ.get_recommended_pairs();
          VIZ.get_graph_data();
          logs.push({type:'create alias'})
        }
    })    
  }
}