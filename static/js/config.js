var CONFIG = {
  "svgs": [
    {id: "#storyline", name: "timeline", margin: {top: 15, right: 20, bottom: 20, left: 150}},
    {id: "#graph", name: "graph", margin: {top: 10, right: 10, bottom: 10, left: 10}},
    {id: "#wordcloud", name: "wordcloud", margin: {top: 10, right: 10, bottom: 10, left: 10}},
  ],
  "margin": {top: 15, right: 20, bottom: 20, left: 150},
  "color": ["teal","red","blue"],
  "demographics": [
    {identity: "Gender", categories: [ "Male", "Female", "Non Binary", "Other (please specify)"]},
    {identity: "Race", categories: ["White", "Black or African American", "Asian", "American Indian or Alaska Native", 
                                "Native Hawaiian or Other Pacific Islander", "Other (please specify)"]},
    {identity: "Age", categories: ["Young", "Middle-aged", "Old"]},
    { identity: "Ethnicity", categories: ["White (American)", "White (Russian)", "White (German)", "Asian (Singapore)"] },
    {identity: "Other (please specify)", categories: []}
  ],
  "default_character_color": "blue",
  "default_bar_color": "#2196F3",
  "highlight_color": "orange",
  "count_bar_color": "#69b3a2",
  "timeline_div":"#storyline",
  "character_state": {"active":1, "removed": 2, "ignored": 3},
  "bins": 150,
}
