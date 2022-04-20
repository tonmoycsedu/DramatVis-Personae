/*
Define global variables and class accessor
*/
var ED, VIZ, CHARACTER;
var tooltip;
var Delta = Quill.import('delta');
let logs = [];

/*
Dummy data
*/
var line_data = {x: [1,2,3], series: [{name: "harry", values: [1,2,3]}, {name: "ron", values: [5,6,1]}]}
var network_data = {nodes: [{id:0},{id:1},{id:2}], links: [{source:0,target:1,value:12}, {source:0,target:2,value:2}]}
var myWords = {
                "words": [
                  {word: "Running", size: "10"}, 
                  {word: "Surfing", size: "20"}, 
                  {word: "Climbing", size: "50"}, 
                  {word: "Kiting", size: "30"}, 
                  {word: "Sailing", size: "20"}, 
                  {word: "Snowboarding", size: "60"} 
                ]
              };

$( document ).ready(function() {
  // Handler for .ready() called.
  // console.log(name, doc, story_type)
  $("#wordcloud_div").show()
  $("#hide_div").show()
  $("#project_name").val(name)
  $("#project_name").show()

  ED = new Editor();
  // ED.quill.disable();
  VIZ = new Viz();
  CHARACTER = new Character();
  // VIZ.update_timeline("#storyline",line_data);
  // VIZ.update_network(network_data);
  // VIZ.update_wordcloud("wordcloud",myWords);
  $('.ui.accordion')
    .accordion();

  // $('.ui.sidebar')
  //   .sidebar()
  // ;
  
  $('#notification')
    .popup({
      on: 'click',
      inline     : true,
      hoverable  : true,
      position   : 'bottom left',
      delay: {
        show: 300,
        hide: 800
      }
    });
  $('#wordcloud_select')
  .dropdown({
    clearable: true,
    placeholder: 'Select'
  });

  $('.ql-toolbar')
    .append("<div id='custom_entity' class='ui basic label blue' style='display:none'></div>"+
              "<div id='add_custom_entity' class='ui mini icon button' style='display:none'>"+
                "<i class='check icon'></i>"+
              "</div>")
  install_custom_entity()
  // ED.install_events()
  logs = []
  // start_logging();
  setTimeout(function () { update(ED.quill.getText()); Q = new Question(q_list);}, 1000)
});

/*
toggle UI visible/hidden
*/
$("#toggle-ui").on("change",function(){
  $( "#bias_div" ).slideToggle("slow", function() {
    // Animation complete.
    if($("#editor_div").hasClass("col-lg-7")){
      $("#editor_div").removeClass("col-lg-7")
      $("#editor_div").addClass("col-lg-12")
    }
    else {
      $("#editor_div").removeClass("col-lg-12")
      $("#editor_div").addClass("col-lg-7")
    }
    logs.push({type:'ui toggled'})

  });
})

function update(content) {
  console.log("updating")
  $("#loader").addClass("active")
  ED.set_new_text(content)
  $.ajax({
      url: '/study_timeline',
      data: JSON.stringify({txt:content, user_defined: CHARACTER.user_defined, story_name: name}),
      type: 'POST',
      contentType:"text/plain",
      success: function(res){
        console.log(res)
        $("#loader").removeClass("active")
        // ED.set_entities(res.entities)
        CHARACTER.list_NER(res.characters)
        ED.set_old_text(content)
        ED.set_sentence_limits(res.sentence_limits)
        ED.set_active_sentence_limits(res.sentence_limits)
        VIZ.set_data(res.timeline)
        VIZ.update_timeline();
        VIZ.get_wordcloud_data()
        VIZ.get_graph_data()
        // create_dummy_sent_button(res.sentence_limits)
        logs.push({type:'full update'})
      },
      error: function(error){
        console.log("error !!!!");
      }
  });
}

// Save periodically
function start_logging() {
  setInterval(function() {
    if (logs.length > 0) {
      console.log('Saving logs');

      // Send entire document
      $.ajax({
        url: '/saveLogs',
        data: JSON.stringify({logs: logs, name: $("#project_name").val()}),
        type: 'POST',
        success: function(res){
          console.log(res)
          logs = [];
        },
        error: function(error){
          console.log("error !!!!");
        }
      }); 
    }
  }, 5*1000);
}

function install_custom_entity(){
  $('#add_custom_entity').on("click", function(){
    console.log("enter")
    let txt = $("#custom_entity").html()
    if (txt.length){
      if (window.confirm("Do you want to track "+txt+"?")) {
        CHARACTER.user_defined.push(txt)
      }
    }
      
  })
}

$("body").on("click",".alert",function(){
  // var name = $(this).children("strong").html()
  // ED.append_property_to_entity(name,"active",1)
  // // var width = $("td").width()
  // var html_string = '<tr><td>'+
  //                     '<div class="ui grey large horizontal label">'+name+'</div></td>'+
  //                   '<td><select class="gender dropdown">'+
  //                     '<option>Select</option>'+
  //                     '<option>Male</option>'+
  //                     '<option>Female</option>'+
  //                     '<option>Non Binary</option>'+
  //                     '</select></td>'+
  //                   '<td><select class="skintone dropdown">'+
  //                       '<option>Select</option>'+
  //                       '<option>Light</option>'+
  //                       '<option>Dark</option>'+
  //                       '</select></td>'+
  //                   '<td>'+VIZ.rect_html(name,VIZ.calculate_persona_presence(name,ED.get_entities()))+'</td><td></td></tr>';
  // $("#person_table").append(html_string)
  // VIZ.update_all_persona_rects(ED.get_entities())
  $(this).alert("close")


})

// $("body").on("change",".dropdown",function(){

//   if($(this).hasClass("gender")){
//     ED.append_property_to_entity($(this).closest("tr").find(".label").html(),"gender",$(this).val())
//     ED.append_property_to_entity($(this).closest("tr").find(".label").html(),"active",1)
//   }
//   else {
//     ED.append_property_to_entity($(this).closest("tr").find(".label").html(),"skintone",$(this).val())
//     ED.append_property_to_entity($(this).closest("tr").find(".label").html(),"active",1)
//   }
//   VIZ.update_global_charts(ED.get_entities())
//   console.log(ED.entities)
// })
var timer_stop = 0;
var timeout = 0;
function start_timer(){
  document.getElementById('timer').innerHTML =
    15 + ":" + 01;
  startTimer(); 
}
function checkSecond(sec) {
  if (sec < 10 && sec >= 0) { sec = "0" + sec }; // add zero in front of numbers < 10
  if (sec < 0) { sec = "59" };
  return sec;
}
function startTimer() {
  var presentTime = document.getElementById('timer').innerHTML;
  var timeArray = presentTime.split(/[:]+/);
  var m = timeArray[0];
  var s = checkSecond((timeArray[1] - 1));
  if (s == 59) { m = m - 1 }
  if (m < 0) {
    return
  }

  document.getElementById('timer').innerHTML =
    m + ":" + s;
  // console.log(m)
  timeout = setTimeout(startTimer, 1000);

}

// ---------------- Study Functions -----------------
function create_dummy_sent_button(sents){
  sents.forEach(function(d,i){
    $("#study_div").append("<p class='sent_limit' ind='"+i+"'>"+i+'---'+d+"</p>")
  })

}
$("body").on("mouseover",".sent_limit",function(){
  let ind = $(this).attr('ind')
  console.log(ind)
  ED.highlight_sentence(+ind, true);
})
$("#answer_questions").on("click", function(){
  var opt = confirm("Do you want to start answering the questions? You will have 15 minutes to answer 7 questions.")

  if(opt) {
    $("#answer_questions").hide()
    $("#forward").show()
    $("#backward").show()
    $("#timer_label").show()
    $("#stop_timer").show()
    Q.reset();
    Q.getQA();
    start_timer();
  }
})

$("#forward").on("click", function () {
  Q.increaseCurrNumber()
  Q.reset()
  Q.getQA()
})

$("#backward").on("click", function () {
  Q.decreaseCurrNumber()
  Q.reset()
  Q.getQA()
})

$("#stop_timer").on("click", function(){
  if(timer_stop) {
    timer_stop = 0
    startTimer()
  }
  else {
    timer_stop = 1
    clearTimeout(timeout);
  }

})


