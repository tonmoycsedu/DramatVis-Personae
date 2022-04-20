class Viz {

  /* 
    ------------------ CONSTRUCTOR --------------
  */
  constructor() {
    this.data = [];
    this.binned_data = [];
    this.pairs = [];
    this.words = {};
    this.svgs = {};
    this.selected = [];
    this.selected_labels = [];
    this.aggregate = 1
    this.edges = [];
    this.char_mapping = {}
    CONFIG['svgs'].forEach((svg, i) => {
      const id = svg.id;
      const name = svg.name;
      this.svgs[name] = {id: id, name:name, margin: svg.margin};
      this.svgs[name].width = $(id).width() - svg.margin.left - svg.margin.right;
      this.svgs[name].height = $(id).height() - svg.margin.top - svg.margin.bottom;

      this.svgs[name]['g'] = d3.select(id)
  					.append("svg")
              // .attr("preserveAspectRatio", "none")
              // .attr("width", this.svgs[name].width + CONFIG.margin.left + CONFIG.margin.right)
              // .attr("height", this.svgs[name].height + CONFIG.margin.top + CONFIG.margin.bottom);
              .attr("viewBox", [0, 0, this.svgs[name].width, this.svgs[name].height]);

      // this.svgs[name]['g'] = this.svgs[name]['svg'].append("g")
      //         .attr("transform",
      //               "translate(" + 0 + "," + CONFIG.margin.top + ")");

    });
    this.add_show_dropdown();
    this.add_sort_dropdown();
    
    this.add_reset_button();
    this.add_binning_option();
    this.install_events();
  }

  /* 
    ------------------ UTILITY --------------
  */
  set_data (data) {
    // set the main data for the viz
    data = data.sort((a, b) => (a.index > b.index) ? 1 : -1)
    this.data = data;
  }

  inverse(obj){
    var retobj = {};
    for(var key in obj){
      retobj[obj[key]] = key;
    }
    return retobj;
  }

  calculate_total_word_count(g){
    let total = 0;
    g[2].forEach(function(w){
      total += w[1].length;
    })
    return total
  }

  getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
  }

  get_df(groups){
    let counter = {};
    let curr_index = {};

    for(let i = 0; i< groups.length; i++){
      let g = groups[i];

      g[2].forEach(function(w){
        if( !(w[0] in counter) ){
          counter[w[0]] = 1
          curr_index[w[0]] = i
        }
        else {
          if(curr_index[w[0]] != i){
            counter[w[0]] += 1
            curr_index[w[0]] = i
          }
        } 
      })
    }

    return counter;
  }

  /*
    ----------------- HTML CODES ------------------
  */
  add_show_dropdown(){
    $("#timeline_header").append("<label>Show</label><select id='show_dropdown'><option value='characters'>Characters</option>"+
      "<option value='demographics'>Demographics</option><option value='intersectional'>Intersectional Identity</option></select>")
  }

  add_sort_dropdown(){
    $("#timeline_header").append("<label style='margin-left:10px'>Order</label><select id='sorting_dropdown'><option value='descending'>Descending</option>"+
      "<option value='ascending'>Ascending</option></select>")
  }
  add_reset_button() {
    $("#timeline_header").append("<button id='reset' style='margin-left:10px; cursor:pointer; border-radius: 4px;'>Reset</button>")
  }
  add_binning_option() {
    $("#timeline_header").append('<input id="aggregate" style="margin-left:10px" type="checkbox" name="aggregate" checked> '+
      '<label for="aggregate">Aggregate</label>')

  }

  /*
    --------------- TIMELINE -------------------------
  */
  resize_timeline_svg(name, data, max_sentence) {
    if(data.length < 8)
      this.svgs[name].height = 200;
    else if ((data.length >= 8) && (data.length <15))
      this.svgs[name].height = data.length*30;
    else
      this.svgs[name].height = data.length*20;

    // if(max_sentence > 150 && max_sentence < 1000)
    //   this.svgs[name].width = (max_sentence+5)*1.5;
    // else
    //   this.svgs[name].width = (max_sentence+5);
    this.svgs[name]['g']
      // .attr("width", this.svgs[name].width+ CONFIG.margin.left + CONFIG.margin.right)
      // .attr("height", this.svgs[name].height+ CONFIG.margin.top + CONFIG.margin.bottom)
        .attr("viewBox", [0, 0, this.svgs[name].width, this.svgs[name].height]);
  }

  bin_data (data) {

    let sent_limits = ED.get_sentence_limits();
    let new_sent_limits = [0];

    let len = data.length;
    let bin_width = parseInt(len/CONFIG['bins'])
    let ind = 0
    let curr_count = 0

    data.forEach(function(d,i){
      
      if((curr_count == bin_width) && (d.index != data[i-1].index)) {
        ind += 1
        curr_count = 0
        new_sent_limits.push(sent_limits[d.index])
      }
      else if (curr_count != bin_width){
        curr_count += 1;
      }

      d.index = ind;
      
    })
    // for(let i=0; i< sent_limits.length; i += bin_width){
    //   new_sent_limits.push(sent_limits[i])
    // }
    ED.set_active_sentence_limits(new_sent_limits);

    return data
  }

  create_data (data, option) {

    if(data.length > CONFIG['bins'] && this.aggregate){
      data = this.bin_data(data)
      this.binned_data = data
    }
    else{
      ED.set_active_sentence_limits(ED.get_sentence_limits());
    }
    // console.log(this.binned_data)

    let characters = CHARACTER.characters;
    let character_dict = CHARACTER.character_dict;
    let alias_dict = CHARACTER.alias_dict;
    let new_data = []

    if (option == "characters"){
      data.forEach(function(d) {
        if(character_dict[d.name] == CONFIG['character_state']['active']) {
          if(d.name in alias_dict) {
            d.name = alias_dict[d.name]
          }
          new_data.push(d)
        }
      })
    }
    else if(option == "demographics"){
      let ignore_keys = ['name','trimmed_name','alias', 'sentence', 'demographics']
      data.forEach(function(d) {
        if(character_dict[d.name] == CONFIG['character_state']['active']) {

          let obj = characters.find(c => c.name == d.name);
          if(d.name in alias_dict) {
            obj = characters.find(c => c.name == alias_dict[d.name]);
          }
          // console.log(d.name, d, obj);
          for(let key in obj){
            if(ignore_keys.indexOf(key) == -1){
              new_data.push({'name':obj[key],'sentence':d.sentence, 'index': d.index})
            }
          }  
        }
      })
    }
    else {
      data.forEach(function(d) {
        if(character_dict[d.name] == CONFIG['character_state']['active']) {

          let obj = characters.find(c => c.name == d.name);
          if(d.name in alias_dict) {
            obj = characters.find(c => c.name == alias_dict[d.name]);
          }
          // console.log(obj);
          let key = "";
          for (let k in obj.demographics) {
            key += obj.demographics[k] + " "
          }
          if(key != ""){
            // console.log(key)
            new_data.push({'name':key,'sentence':d.sentence, 'index': d.index}) 
          }
        }
      })
    }
    
    return new_data
  }

  update_timeline(sort="descending"){

    sort = $("#sorting_dropdown").val()
    let option = $("#show_dropdown").val()

    let data = JSON.parse(JSON.stringify(this.data));
    let name = "timeline";
    // console.log("data before change:",data);
    data = this.create_data(data, option);
    // console.log("data after change:",data);

    /// prepare data
    let group = d3.rollups(data, group => d3.sum(group, d => d.index == 0 ? 1: d.index/d.index), d => d.name)
    // let group_map = d3.rollup(data, group => d3.sum(group, d => d.sentence == 0 ? 1: d.sentence/d.sentence), d => d.name)
    group = sort == "ascending" ? group.sort(([, a], [, b]) => d3.ascending(a, b)) : group.sort(([, a], [, b]) => d3.descending(a, b)) 

    this.resize_timeline_svg(name,group,d3.max(data, d => d.index))
    // console.log(group_map.get("Harry"))

    let svg = this.svgs[name];
    var self = this;
    svg.g.html("");
    // console.log(svg)

    svg.x = d3.scaleLinear()
                // .padding(0.3)
                .range([CONFIG.margin.left, svg.width - CONFIG.margin.right])
                .nice();
    
    svg.y = d3.scaleBand()
                .range([CONFIG.margin.top, svg.height - CONFIG.margin.bottom])
                .padding(0.3);
    
    svg.x_bar = d3.scaleLinear()
                  .range([10,CONFIG.margin.left]);
    
    svg.opacity = d3.scaleLinear()
                  .range([0.2,1])
                  .domain([0, d3.max(group, g => g[1])]);

    // let group = d3.groupSort(data, g => g.length, d => d.name)      
    // console.log(group)
    let y_domain = group.map(([key]) => key);
    let x_domain = [0,d3.max(data, d => d.index)+2]
    // let x_domain = data.map(d => d.index)
    let bar_domain = [-d3.max(group, g => g[1]),0]
    // console.log(bar_domain)

    svg.x.domain(x_domain)
    svg.y.domain(y_domain)
    svg.x_bar.domain(bar_domain)

    svg.xAxis = g => g
                  .attr("transform", `translate(0,${svg.height - CONFIG.margin.bottom})`)
                  .call(d3.axisBottom(svg.x))
                  .call(g => g.selectAll(".tick").remove())
                  .call(g => g.select(".domain").remove());

    svg.yAxis = g => g
                .attr("transform", `translate(${CONFIG.margin.left},0)`)
                .call(d3.axisLeft(svg.y));

    svg.g.append("g")
        .call(svg.xAxis);

    svg.bars = svg.g.append("g")
          .selectAll("rect")
          .data(data)
          .join("rect")
            .attr("character",d => d.name)
            .attr("class","timeline_bar")
            .attr("x", d => svg.x(d.index))
            .attr("y", d => svg.y(d.name))
            .attr("width", d => Math.abs(svg.x(d.index - 0.5) - svg.x(d.index + 0.5) ))
            // .attr("width", svg.x.bandwidth())
            .attr("height", svg.y.bandwidth())
            // .attr("opacity", d => svg.opacity(group_map.get(d.name)))
            .attr("opacity", this.aggregate ? 0.5 : 0.9)
            .attr("fill", CONFIG["default_bar_color"]);

    svg.count_bars = svg.g.append("g")
            .attr("opacity", 0.3)
          .selectAll("rect")
          .data(group)
          .join("rect")
            .attr("character",d => d.name)
            .attr("class","name_bar")
            .attr("x", d => svg.x_bar(-d[1]))
            .attr("y", d => svg.y(d[0]))
            .attr("width", d => Math.abs(svg.x_bar(-d[1]) - svg.x_bar(0)))
            .attr("height", svg.y.bandwidth())
            .attr("fill", CONFIG['count_bar_color']);

    svg.g.append("g")
          .style("font-size", "15px")
          .style("font-family", "Gill Sans, sans-serif")
          .style("cursor","pointer")
          .call(svg.yAxis)
        .selectAll(".tick text")
          .call(self.wrap, svg.margin.left-20);

    svg.g.selectAll(".tick > text").attr("class","y_labels");

    svg.g.append("text")
      .attr("x", svg.x(0)-10)
      .attr("y", CONFIG.margin.top-5)
      .attr("text-anchor","end")
      .style("font-size", "10px")
      .style("font-family", "Gill Sans, sans-serif")
      .style("opacity",0.5)
      .html("&#x2190 Total mentions");
    
    svg.g.append("text")
      .attr("x", svg.x(0)+10)
      .attr("y", CONFIG.margin.top-5)
      .attr("text-anchor","start")
      .style("font-size", "10px")
      .style("font-family", "Gill Sans, sans-serif")
      .style("opacity",0.5)
      .html("Every mentions in the story &#x2192 ");
    
    this.install_events();
  }

  wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", -10).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  /*
   ---------------------- WORDCLOUD -------------------------
  */
  get_wordcloud_data(update = false){
    var self = this;
    $.ajax({
      url: '/wordcloud',
      data: JSON.stringify({kind:$("#word_option").val()}),
      type: 'POST',
      success: function(res){
        console.log(res)
        self.words = res.words.words
        self.df = res.df;
        self.get_recommended_pairs(self);
        if(update)
          self.update_wordcloud(self.selected_labels)
        // self.update_wordcloud(res.words);
      },
      error: function(error){
        console.log("error !!!!");
      }
    });
  
  }

  create_wordcloud_data(data, option=false){
    var self = this;
    let words = [];
    let category = 1;
    if(!option)
      option = $("#show_dropdown").val()

    if(option == "characters") {
      data.forEach(function(d){
        let obj = CHARACTER.characters.find(c => c.name == d);
        if(d in self.words){
          self.words[d].forEach(function(w){
            words.push({'word':w, 'category':category, 'character':d})
          })
        }
        if("alias" in obj) {
          obj.alias.forEach(function(a){
            if(a in self.words){
              self.words[a].forEach(function(w){
                words.push({'word':w, 'category':category, 'character':d})
              })
            }
          })
        }
        category += 1
      })
    }

    else if(option == "demographics") {
      data.forEach(function(d){
        CHARACTER.characters.forEach(function(c){
          if(Object.values(c.demographics).indexOf(d) != -1) {
            if(c.name in self.words){
              self.words[c.name].forEach(function(w){
                words.push({'word':w, 'category':category, 'character':d})
              })
            }
            if("alias" in c) {
              c.alias.forEach(function(a){
                if(a in self.words){
                  self.words[a].forEach(function(w){
                    words.push({'word':w, 'category':category, 'character':d})
                  })
                }
              })
            }
          }
        })
        category += 1
      })
    }
    else {
      data.forEach(function(d){
        CHARACTER.characters.forEach(function(c){
          let val = Object.values(c.demographics).join(" ")
          console.log(val,d)
          if(val.trim() == d.trim()) {
            console.log(c.name)
            if(c.name in self.words){
              self.words[c.name].forEach(function(w){
                words.push({'word':w, 'category':category, 'character':d})
              })
            }
            if("alias" in c) {
              c.alias.forEach(function(a){
                if(a in self.words){
                  self.words[a].forEach(function(w){
                    words.push({'word':w, 'category':category, 'character':d})
                  })
                }
              })
            }
          }
        })
        category += 1
      })
    }
    return [words];
  }

  update_wordcloud(data, option=false) {
    // if(Object.keys(data).length){
    var self = this;
    // let res = this.create_wordcloud_data(data, option);

    // let groups = d3.flatGroup(res[0], w => w.character, w => w.category)
    //   .map(([character, category , words]) => [
    //     character,
    //     category,
    //     d3.flatGroup(words, w => w.word)
    //     .sort(([, a], [, b]) => d3.descending(a, b))
    //     .splice(0,30),
    //   ]);

    // let dataSet = []
    // groups.forEach(function (g) {
    //   g[2].forEach(function(w){
    //     dataSet.push({'character':g[0], 'category': g[1], 'word': w[0], 'weight': w[1].length/self.df[w[0]]})
    //   })
    // })
    
    // let max = d3.max(dataSet, d => d.weight);
    // let min = d3.min(dataSet, d => d.weight);

    // dataSet.forEach(function(d){
    //   d.weight = (d.weight - min)/(max-min)
    //   if(d.weight <= 0.1)
    //     d.weight = 0.1
    // })
    var res = this.create_wordcloud_data(data, option);
    var max_per_words =+ $("#word_threshold").val()
    // console.log(res[0])

    // let dataSet = d3.flatRollup(res[0], v => v.length, w => w.character, w => w.category, w => w.word)
    //   .map(([character, category, word, weight]) => [
    //     character, category, word, weight/self.df[word]
    //   ])
    //   .sort(([a1,a2,a3, _a], [b1,b2,b3, _b]) => d3.descending(_a, _b)).splice(0,max_per_words)
    
    // console.log(groups)

    let groups = d3.flatGroup(res[0], w => w.character, w => w.category)
      .map(([character, category , words]) => [
        character,
        category,
        d3.flatGroup(words, w => w.word)
      ]);

    var dataSet = []
    var N = groups.length;
    var df = self.get_df(groups)
    console.log("df: ", df)

    groups.forEach(function (g) {

      // let total = self.calculate_total_word_count(g)
      // console.log("tf: ", total)
      var obj = []
      g[2].forEach(function(w){
        var weight = w[1].length;
        if(!weight)
          console.log('nan', w)

        if ((w[0] in df) && (weight)){
          //  console.log("word: ", w[0], " tf: ", (weight) * (1/self.df[w[0]]))
          // if( N == 1)
            weight = (weight) * (1/df[w[0]])
          // else
          //   weight = (weight/total) * self.getBaseLog(10, N/df[w[0]])
        }
        else
          weight = 1
        // console.log(weight)
        if(!isNaN(weight))
          obj.push({'character':g[0], 'category': g[1], 'word': w[0], 'weight': weight})
      })
      // console.log(obj)
      
      var newobj = obj.sort((a, b) => (a.weight > b.weight) ? 1 : -1).slice(0,max_per_words)
      // console.log(newobj)
      newobj.forEach(function(o){ if(o.weight) dataSet.push(o) })
    
    })
    
    // console.log(dataSet)
    // // dataSet = dataSet.sort((a, b) => (a.weight < b.weight) ? 1 : -1).splice(0,max_per_words);
    // // console.log(dataSet)
    // let max = d3.max(dataSet, d => d.weight);
    // let min = d3.min(dataSet, d => d.weight);

    // dataSet.forEach(function(d){
    //   d.weight = (d.weight - min)/(max-min)
    //   if(d.weight <= 0.1)
    //     d.weight = 0.1
    // })
    console.log("after rollups", dataSet);

    var BrowserText = (function () {
      var canvas = document.createElement('canvas'),
          context = canvas.getContext('2d');
  
      /**
       * Measures the rendered width of arbitrary text given the font size and font face
       * @param {string} text The text to measure
       * @param {number} fontSize The font size in pixels
       * @param {string} fontFace The font face ("Arial", "Helvetica", etc.)
       * @returns {number} The width of the text
       **/
      function getWidth(text, fontSize, fontFace) {
          context.font = fontSize + 'px ' + fontFace;
          return context.measureText(text).width;
      }
  
      return {
          getWidth: getWidth
      };
    })();

    // create the encompassing svg
    let name = "wordcloud"
    let svg = this.svgs[name];
    svg.g.html("");

    // initialize constants
    const width = svg.width-10,        // svg width
    height = svg.height,          // svg height
    circleDiameter = 190,  // diameter of entire circle
    clusterPadding = 10,   // separation between different-color nodes
    maxRadius = 10,        // required by force cluster package
    baseFontSize = 10,     // this font size gets randomly varied
    fontOffset = 0.5,
    fontFace = 'Cairo',    // font face
    padding = 8,
    categoryOffset = 1;    // categories in data must be numbered consecutively; 

    const pink = 'rgb(245, 41, 121)', green = 'rgb(35, 183, 13)', deeppurple = 'rgb(51, 41, 151)',
    redbrown = 'rgb(126, 0, 2)', orange = 'rgb(253, 107, 9)', lavendar = 'rgb(90, 87, 170)',
    blue = 'rgb(11, 94, 153)', tomato = 'rgb(243, 0, 21)', purple = 'rgb(114, 41, 114)';
  
    // array of unique category numbers (usually 1 ... n)
    let uniqueRegions = Array.from(new Set(dataSet.map(d => d.category))) 
    let m = uniqueRegions.length; // number of distinct categories
    
    // map category numbers into colors
    let  colorScaleOrdinal = d3.scaleOrdinal()
      .range([green, blue, pink, lavendar, redbrown, orange, purple])
      .domain(uniqueRegions);
    
    
    let category = 1

    d3.selectAll(".y_labels").style("fill","black");
    data.forEach(function(d){
      dataSet.push({'word':d, 'category':category, 'character':d, 'weight':2})
      category += 1
      // d3.selectAll(".y_labels").filter(t => t == d).style("fill", colorScaleOrdinal((d - categoryOffset)/10))
    })
    
    // Find the span of values (min to max) from an array 
    function getRangeFromValues(dataset, fieldname) {
      const values = Array.from(new Set(dataset.map(d => d[fieldname])));
      return [d3.min(values), d3.max(values)];                       
    }
  
    // Map opacity scores into a range according to weight field
    let opacityScale = d3.scaleLinear().range([.8, 1.2])
      .domain(getRangeFromValues(dataSet, 'weight'));     

    // Store the largest node for each cluster.
    let clusters = new Array(m);

      // create a set of nodes, one for each data item
    let nodes = dataSet.map(function(datum) {
      const fontSize = (datum.weight+1) * baseFontSize, //baseFontSize + datum.weight, // modify font size by input weight
            textLength = BrowserText.getWidth(datum.word, fontSize, fontFace), // get length of text string
            clusterNum = datum.category-categoryOffset,     // index number for cluster
            r = fontSize * fontOffset,  // need r!! used somewhere internally to clustering algorithm
            // create a record for each data item using values defined above
            d = {
            cluster: clusterNum,
            name: datum.word,
            weight: datum.weight,
            radius: r,            // need this!! 
            // place each datum from each cluster in one location along the diameter of the circle
            // using m-1 because the first cluster goes in the center
            x: Math.cos(clusterNum / (m-1) * 2 * Math.PI) * circleDiameter + width / 2 + Math.random(),
            y: Math.sin(clusterNum / (m-1) * 2 * Math.PI) * circleDiameter + height / 2 + Math.random(),
            fontSize: fontSize,
            textLength: textLength
            };
      // put words from first category in the center
      if (clusterNum == 0) {
        d.x =  width / 2 + Math.random();
        d.y =  height / 2 + Math.random();
      }
      // choose the longest word to go in the center for each cluster
      if (!clusters[clusterNum] || (textLength > clusters[clusterNum].textLength)) clusters[clusterNum] = d;	
      return d;
    });

    // attach text to the nodes laid out above
    let words = svg.g.selectAll('text')
    .data(nodes)
    .enter().append('text')
      .style("text-anchor", "middle")
      .attr("font-family", fontFace)
      .attr("font-size", d=>d.fontSize)
      .attr('opacity', function(d) { return opacityScale(d.weight)})
      .style('fill', function (d) { return colorScaleOrdinal(d.cluster/10); })

    // Tick function required by force-directed cluster simulation
    function layoutTick (e) {
    words
      .attr('x', function (d) { return d.x; })
      .attr('y', function (d) { return d.y; }) 
      .text(d => d.name)
    }

  //   /* Need bounding boxes for text, which behaves differently than the circles that are usually plotted.
  //   Therefore, we use rectangleCollide, 
  //   from https://github.com/emeeks/d3-bboxCollide: 
  //   replacing var rectangleCollide = bboxCollide.bboxCollide([[-10,-5],[10,5]]) */
      
    const rectangleCollide =  d3.bboxCollide(function(d) {
      return [[-d.textLength/2, -d.fontSize/2],[d.textLength/2, d.fontSize/2]];
    });

    function callSimulation() {
      return d3.forceSimulation(nodes)
        // keep entire simulation balanced around screen center
        .force('center', d3.forceCenter(width/2, height/2))
      
        .force('cluster', d3.forceCluster()
          .centers(function (d) { return clusters[d.cluster]; })
          .strength(0.7))
      .force('collide', rectangleCollide)
      .on('tick', layoutTick);
    }
      
    let simulation = callSimulation();
  }

  /*
   ---------------------- RECOMMENDATIONS -------------------------
  */
  get_recommended_pairs() {
    var self = this
    $.ajax({
      url: '/distance_wordcloud',
      data: JSON.stringify({data: self.words, characters: CHARACTER.characters}),
      type: 'POST',
      success: function(res){
        console.log(res)
        self.pairs = res['pairs'].sort((a, b) => (a.score < b.score) ? 1 : -1)
        self.update_pairs(self)
      },
      error: function(error){
        console.log("error !!!!");
      }
    });

  }

  append_recommendation(p) {
    let color = "yellow"
    if(p.score > 0.8)
      color = "red"
    
    let html_string = '<div class="item recs" type="'+p.type+'" e1="'+p.e1+'" e2="'+p.e2+'"><div class="ui mini '+color+' left label"></div>'+
    '<span class="e1">'+ p.e1 + '</span> --- <span class="e2">'+ p.e2+ '</span></div>';
      
    $("#recommentdations").append(html_string)

  }

  update_pairs(self){
    $("#recommentdations").empty()
    self.pairs.forEach(function(p){
      self.append_recommendation(p)
    })
    $("#total_recs").html(self.pairs.length)
    self.install_events()
  }

  /*
    ------------------- IMPACT GRAPH ----------------------
  */
  get_graph_data(update = false){
    var self = this;
    console.log(CHARACTER.alias_dict)
    $.ajax({
      url: '/get_graph',
      type: 'POST',
      data: JSON.stringify({alias_dict:CHARACTER.alias_dict, characters: CHARACTER.characters.map(d => d.name)}),
      success: function(res){
        console.log(res)
        self.edges = res.edges
        // self.char_mapping = res.char_mapping
      },
      error: function(error){
        console.log("error !!!!");
      }
    });
  
  }

  create_network_data(selected, option){

    var self = this;
    let nodes = []
    let links = []
    var unique_chars = {};
    let chars = CHARACTER.characters.map(d => d.name);

    if(!option)
      option = $("#show_dropdown").val()

    if(option == "characters") {
      self.edges.forEach(function(edge){
        if(edge.source == selected || edge.target == selected){
          // if((chars.indexOf(edges.source) != -1) && (chars.indexOf(edges.target) != -1) ){
            links.push(edge)
            unique_chars[edge.source] = 1
            unique_chars[edge.target] = 1
          // }
        }
      })
    }

    // console.log("links before", links)

    links = d3.flatRollup(links, v => v.length, d => d.source, d => d.target)
                .map(([source, target, value]) => ({source, target, value}));

    // console.log("links after", links)
    // else if(option == "demographics") {
      
    //   CHARACTER.characters.forEach(function(c){
    //     if(Object.values(c.demographics).indexOf(selected) != -1) {
    //       if(c.name in self.words){
    //         self.words[c.name].forEach(function(w){
    //           words.push({'word':w, 'category':category, 'character':d})
    //         })
    //       }
    //       if("alias" in c) {
    //         c.alias.forEach(function(a){
    //           if(a in self.words){
    //             self.words[a].forEach(function(w){
    //               words.push({'word':w, 'category':category, 'character':d})
    //             })
    //           }
    //         })
    //       }
    //     }
    //   })   
    // }
    // else {
    //   data.forEach(function(d){
    //     CHARACTER.characters.forEach(function(c){
    //       let val = Object.values(c.demographics).join(" ")
    //       console.log(val,d)
    //       if(val.trim() == d.trim()) {
    //         console.log(c.name)
    //         if(c.name in self.words){
    //           self.words[c.name].forEach(function(w){
    //             words.push({'word':w, 'category':category, 'character':d})
    //           })
    //         }
    //         if("alias" in c) {
    //           c.alias.forEach(function(a){
    //             if(a in self.words){
    //               self.words[a].forEach(function(w){
    //                 words.push({'word':w, 'category':category, 'character':d})
    //               })
    //             }
    //           })
    //         }
    //       }
    //     })
    //     category += 1
    //   })
    // }
    for (let k in unique_chars)
      nodes.push({'id': k})
    
    return { nodes: nodes, links: links}

  }
  
  update_network(selected){

    let option = $("#show_dropdown").val()

    if(option == "characters") {
      let self = this;
      let data = self.create_network_data(selected)

      const links = data.links.map(d => Object.create(d));
      const nodes = data.nodes.map(d => Object.create(d));

      let name = "graph";
      let svg = this.svgs[name];
      svg.g.html("");

      let drag = simulation => {
  
        function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        }
        
        function dragged(event) {
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        }
        
        function dragended(event) {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        }
        
        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
      }

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        // .force("charge", d3.forceManyBody())
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(svg.width / 2, svg.height / 2));

      const link = svg.g.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));

      const node = svg.g.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
      .selectAll("g")
      .data(nodes)
        .join("g")
        .call(drag(simulation));

      var lables = node.append("text")
        .text(function(d) {
          return d.id;
        })
        .style('font-size', '12px')
        .style('font-family', 'sans-serif')
        .style('stroke','black')
        .style('stroke-width',0.1)
        .attr('x', 6)
        .attr('y', 3);

      var circles = node.append('circle').attr("r", 5)
        .attr("fill", "grey");

      node.append("title")
        .text(d => d.id);

      simulation.on("tick", () => {
      link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

      // circles
      //     .attr("cx", d => d.x)
      //     .attr("cy", d => d.y);
      node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
      });

      $("#graph")
          .show()
        .css("left", (screen.width/2) + "px")
        .css("top", (0) + "px");
    }
    // else {
    //   alert("This feature has not been added yet! Please come back soon.")
    // }
  }

  /*
   -------------- INTERACTIONS ----------------
  */
  install_events () {
    var self = this;
    let name = "timeline";
    let svg = this.svgs[name];

    $("#reset").on("click", reset);

    $("#aggregate").on("change", function(){
      if($(this).prop("checked")) self.aggregate = 1;
      else self.aggregate = 0;
      self.update_timeline()
      logs.push({type:'changed aggregate option'})
    })

    $("#sorting_dropdown").on("change", function(){
      self.update_timeline($(this).val())
      logs.push({type:'changed sorting option'})
    })

    $("#show_dropdown").on("change", function(){
      self.update_timeline()
      self.selected = [];
      self.selected_labels = [];
      logs.push({type:'changed show option'})
      // self.selected_labels = [];
    })

    svg.g.selectAll(".timeline_bar").attr("cursor", "pointer")
      .on("click", bar_click)
      .on("mouseover", bar_mouseover)
      .on("mouseout", bar_mouseout);
    
    function reset() {
      svg.g.selectAll(".timeline_bar").attr("fill", CONFIG['default_bar_color'])
      svg.g.selectAll(".name_bar").attr("fill", CONFIG['count_bar_color'])
      let content = ED.quill.getText();
      ED.remove_hightlight();
      self.selected = [];
      self.selected_labels = [];
      logs.push({type:'timeline reset'})
    }
    
    function bar_click(e,d) {
      console.log(d)
      let sent = d.index;
      let name = d.name;
      if(self.selected.length == 0) {
        svg.g.selectAll(".timeline_bar").attr("fill", function (d){
          return d.index == sent ? CONFIG['highlight_color']: CONFIG['default_bar_color']
        })

        let selected_characters = svg.g.selectAll(".timeline_bar").data()
                                    .filter(d => d.index == sent)
                                    .map(d => d.name);

        svg.g.selectAll(".name_bar").attr("fill", function (d){
          return selected_characters.indexOf(d[0]) != -1 ? CONFIG['highlight_color']: CONFIG['count_bar_color']
        })

        ED.highlight_sentence(+sent, true);
        self.selected.push(d)
        logs.push({type:'timeline bar clicked'})
      }
      else if((sent == self.selected[0].index))
        reset();
    }

    function bar_mouseover(e,d) {
      if(self.selected.length == 0) {
        // console.log(d)
        let sent = d.index;
        let name = d.name;
        svg.g.selectAll(".timeline_bar").attr("fill", function (d){
          return d.index == sent ? CONFIG['highlight_color']: CONFIG['default_bar_color']
        })

        let selected_characters = svg.g.selectAll(".timeline_bar").data()
                                    .filter(d => d.index == sent)
                                    .map(d => d.name);

        svg.g.selectAll(".name_bar").attr("fill", function (d){
          return selected_characters.indexOf(d[0]) != -1 ? CONFIG['highlight_color']: CONFIG['count_bar_color']
        })

        ED.highlight_sentence(+sent, true);
        logs.push({type:'timeline bar mouseover'})
      }
    }
    function bar_mouseout(e,d) {
      if(self.selected.length == 0) {
        // console.log(d)
        let sent = d.index;
        let name = d.name;
        svg.g.selectAll(".timeline_bar").attr("fill",  CONFIG['default_bar_color'])
        svg.g.selectAll(".name_bar").attr("fill", CONFIG['count_bar_color'])

        ED.remove_hightlight();
        logs.push({type:'timeline bar mouseout'})
      }
    }
    svg.g.selectAll(".y_labels")
      .on("click", label_click);

    $("#word_option").on("change", function(){
      self.get_wordcloud_data(true)
      // get_wordcloud_data();
      logs.push({type:'wordcloud option changed'})
    })
    
    function label_click(e, d) {
      console.log(d)
      let pos = d3.pointer(e);
      if(self.selected_labels.indexOf(d) != -1){
        let ind = self.selected_labels.indexOf(d)
        self.selected_labels.splice(ind,1);
        $(this).css("font-weight","normal")
        $("#graph").hide()
      }
      else {
        self.selected_labels.push(d)
        $(this).css("font-weight","bold")
        self.update_network(d)
      }
      self.update_wordcloud(self.selected_labels)
      logs.push({type:'character label clicked'})
    }

    $(".recs").on("click", function(){
      let type = $(this).attr("type")
      let e1 = $(this).attr("e1")
      let e2 = $(this).attr("e2")
      console.log(e1,e2,type)
      self.update_wordcloud([e1,e2],type)
      logs.push({type:'wordcloud rec clicked'})
    })

    $("#graph_close").on("click", function(){
      $("#graph").hide()
    })

    $("#word_threshold").on("change", function(){
      self.update_wordcloud(self.selected_labels)
    })
  }
}
