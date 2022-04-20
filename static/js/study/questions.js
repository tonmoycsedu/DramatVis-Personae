class Question {
    constructor (q_list) {
        this.currNumber = 1;
        this.q_list = q_list;
    }

    getQA (){
        var self = this;

        if (self.currNumber == 8){
            $("#question").append('<b>Thank you for your participation.</b><br/>')
            return;
        }

        $.ajax({
          url: '/getQA',
          data: JSON.stringify({currNumber:self.q_list[self.currNumber-1], story_name: name}),
          type: 'POST',
          success: function(res){
                console.log(res.qa[0])
                self.populateQA(res.qa[0])
          },
          error: function(error){
              console.log("error !!!!");
          }
      });
    }

    populateQA (QA){

        $("#question").append('<b>' + (this.currNumber) + '. '+QA.question+'</b><br/>')

        if ('choices' in QA){
            console.log("enter choices")
            for(let i = 0; i < QA.choices.length; i++){
                let choice = QA.choices[i]
                
                $("#choices")
                    .append('<input type="radio"' + ' id="Cid-' + i +'" name="group">'+
                            '<label> '+choice+'</label><br/>')   
        
            }
        }
    }

    reset (){
        $("#question").empty()
        $("#choices").empty()

    }

    increaseCurrNumber (){
        if (this.currNumber < 12)
            this.currNumber += 1
    }

    decreaseCurrNumber (){
        if (this.currNumber > 1)
            this.currNumber -= 1
    }
}



