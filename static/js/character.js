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

  character_div (character_name, person) {
    /*
    create a character div
    1. a label with character name
    2. a drodown with demographic options
    */
    // console.log(this.characters)

    let html_string = 
      '<div id="characterdiv_'+person+'" original_name="'+character_name+'" class="character_div item">'+
        '<span id="span_'+person+'">'+
          '<div class="ui '+ CONFIG.default_character_color +' large horizontal label">' +
            character_name +
            '<i class="character delete icon"></i>' +
          '</div>'+
        '</span>';

    html_string +=
        '<div id= "dropdown_'+person+'" class="ui dropdown demographics">'+
          'Demographics'+
          '<i class="dropdown icon"></i>'+
          '<div class="menu">';
    
    CONFIG.demographics.forEach( function (d) {
      let submenu = "";
      if (d.identity != "Other (please specify)"){
        submenu += '<div class="item identity">'+
                      '<i class="dropdown icon"></i>'+
                      d.identity +
                      '<div class="right menu">';

      } else {
        submenu += '<div class="ui icon input identity">'+
                      '<input class="new_identity_input" type="text" placeholder='+d.identity+'>'+
                      '<i character='+person+' identity='+d.identity+' class="add link icon identity add_identity"></i>'+
                  '</div>';
      }
        
      d.categories.forEach( function (c) {
        if (c != "Other (please specify)"){
          submenu += '<div character='+person+' identity='+d.identity+' category='+c+' class="item category">'+c+'</div>';
        } else {
          submenu += '<div class="ui icon input category">'+
                          '<i character='+person+' identity='+d.identity+' class="add link icon add_identity_category"></i>'+
                          '<input class="new_identity_category" type="text" placeholder='+c+'>'+
                      '</div>';
        }
      })
      submenu += 
          '</div>'+
        '</div>'

      html_string += submenu;
    })

    html_string +=
          '</div>'+
        '</div>'+
      '</div>';
    
    return html_string;
  }

  list_NER (entities) {

    let character_html = ""

    for (let person in entities){  
      if(!(person in this.character_dict) || (this.character_dict[person] == CONFIG['character_state']['removed'])){

        let trimmed_name = this.trim_selector(person);
        let character_obj = {name: person, trimmed_name:trimmed_name, demographics: {}};
        this.characters.push(character_obj)
        this.character_dict[person] = CONFIG['character_state']['active'];

        character_html += this.character_div(person, trimmed_name)
        // $("")
      }
    }
    $("#person_list").append(character_html)

    for(let person in this.character_dict) {
      if(!(person in entities)){
        console.log("name:"+person)
        let trimmed_name = this.trim_selector(person);
        $("#characterdiv_"+trimmed_name).remove();
        this.character_dict[person] = CONFIG['character_state']['removed'];
        let index = this.characters.findIndex(c => c.trimmed_name == trimmed_name)
        this.characters.splice(index,1); 
      }
    }
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
    });
    
    $('body').on("click", '.character.delete', function() {
      let div = $(this).closest(".character_div");
      let trimmed_name = div.attr("id").split("_")[1]
      let name = div.attr("original_name")
      console.log("deleted", name, trimmed_name)

      self.character_dict[name] = CONFIG['character_state']['ignored'];
      let index = self.characters.findIndex(c => c.trimmed_name == trimmed_name)
      self.characters.splice(index,1); 
      div.remove();
      VIZ.update_timeline();
      VIZ.get_recommended_pairs();
      VIZ.get_graph_data();
      logs.push({type:'delete char'})
    });

    $('body').on("click", '.category.close', function() {
      let div = $(this).closest(".character_div");
      let label = $(this).closest(".ui.label");
      let identity = label.attr('label_identity')
      let trimmed_name = div.attr("id").split("_")[1]
      let name = div.attr("original_name")

      console.log("delete category", name, identity)

      // self.character_dict[name] = CONFIG['character_state']['ignored'];
      let index = self.characters.findIndex(c => c.trimmed_name == trimmed_name)
      delete self.characters[index][identity];
      delete self.characters[index]['demographics'][identity];
      label.remove();
      VIZ.update_timeline();
      VIZ.get_recommended_pairs();
      VIZ.get_graph_data();
      logs.push({type:'detete identity'})
    });

    $('body').on("click", '.add_identity', function() {
      // '<div character='+person+' identity='+d.identity+' category='+c+' class="item category">'+c+'</div>';
      let identity = $(this).parent().find(".new_identity_input").val();
      console.log( identity);
      if (identity !== "") {
        let person = $(this).attr('character')
        console.log(person, identity);
        // let identity = $(this).attr('identity')
        let submenu = '<div class="item identity">'+
                      '<i class="dropdown icon"></i>'+
                      identity +
                      '<div class="menu">'+
                        // '<div character='+person+' identity='+identity+' class="item category">Unspecified</div>'+
                        '<div class="ui icon input category">'+
                          '<i character='+person+' identity='+identity+' class="add link icon add_identity_category"></i>'+
                          '<input class="new_identity_category" type="text" placeholder="other">'+
                        '</div>'
                      '</div>';
                      '</div>'+
                    '</div>';

        $(submenu).insertBefore($('.ui.icon.identity'));
        $(".new_identity_input").val("")
        logs.push({type:'add new identity in dropdown'})
      }
    });

    $('body').on("click", '.add_identity_category', function() {

      let category = $(this).parent().find("input[type='text']").val();
      let person = $(this).attr('character')
      let identity = $(this).attr('identity')
      console.log(person, identity, category)
      // '<div character='+person+' identity='+d.identity+' category='+c+' class="item category">'+c+'</div>';
      let submenu = '<div character='+person+' identity='+identity+' category='+category+' class="item category">'+category+'</div>';
      $(submenu).insertBefore($('.ui.icon.category'));
      $(this).parent().find("input[type='text']").val("")
      logs.push({type:'add new category in dropdown'})

    });
    
  }
}