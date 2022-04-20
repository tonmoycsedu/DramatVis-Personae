from flask import Flask, render_template, url_for, request, jsonify, flash,redirect, session
from flask_pymongo import PyMongo
import pandas as pd
import numpy as np
import spacy
import en_core_web_sm
from spacy.symbols import nsubj, VERB, amod, acomp
import neuralcoref
from state import * 
import re
import os
from forms import RegistrationForm,LoginForm
import socket

import itertools
from gensim.models import KeyedVectors
from scipy.spatial.distance import cosine 
from numpy.linalg import norm
import json
import random

nlp = en_core_web_sm.load()
neuralcoref.add_to_pipe(nlp)
# from io import StringIO

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb+srv://VaiLab:VaiLab123@cluster0-4nqps.mongodb.net/dramatVis"
app.config["SECRET_KEY"] = '80e2229aa326ca04ee982aa63b9b0f13'
mongo = PyMongo(app)

ST = State()
glove = KeyedVectors.load_word2vec_format('glove_50k.bin', binary=True)
ST.set_glove(glove)

## ----------------------- UI routes ------------------------
@app.route("/")   ###default route, home page
def welcome():
    return render_template("welcome.html")

@app.route("/home")
def home():
    # if 'email' in session:
    project_names = []
    # projects = mongo.db.projects
    # active_projects = projects.find({'email':session['email']})
    # for project in active_projects:
    #     project_names.append(project['project_name'])

    files = os.listdir("./static/data/story/")
    files = [file.split(".")[0] for file in files]

    # print(project_names)

    return render_template("home.html", project_names = project_names, sample_project_names = files)

@app.route("/editor/<name>/<story_type>")
def editor(name, story_type):
    # if 'email' in session:
        if name == "none":
            # projects = mongo.db.projects
            # active_projects = projects.find({'email':session['email']})
            # num = 0
            # for project in active_projects:
            #     if "Untitled" in project['project_name']:
            #         num += 1
            return render_template("index.html", doc={}, name = "Untitled"+str(0), story_type=story_type)
        else:
            if story_type == 'user':
                projects = mongo.db.projects
                project = projects.find_one({'email':session['email'], 'project_name':name})
                return render_template("index.html", doc=project['doc'], name= name, story_type=story_type)
            else:
                loc = './static/data/story/'+name+ '.txt'
                with open(loc) as f:
                    lines = f.read()

                return render_template("index.html", doc=lines, name= name, story_type=story_type)
    # else:
    #     flash(f'Please log in!', 'danger')
    #     return redirect(url_for('welcome'))

# @naimul 1/29/2022, code for study
@app.route("/study/condition1/<name>/")
def condition1(name):
    loc = './static/data/story/'+name+ '.txt'
    with open(loc) as f:
        lines = f.read()

    q_list = [1,2,3,4,5,6,7]
    random.shuffle(q_list)

    return render_template("condition1.html", doc=lines, name= name, story_type="none", q_list= q_list)

@app.route("/demo/<name>/")
def condition2(name):
    loc = './static/data/story/'+name+ '.txt'
    with open(loc) as f:
        lines = f.read()

    q_list = [1,2,3,4,5,6,7]
    random.shuffle(q_list)

    return render_template("condition2.html", doc=lines, name= name, story_type="none", q_list= q_list)


@app.route('/getQA',methods=['POST'])
def getQA():
    json_data = request.get_json(force=True); 
    number = json_data["currNumber"]
    story_name = json_data['story_name']

    try:
        QA = mongo.db.questions
        res = QA.find({'number':int(number), 'story': story_name})
        ret = []
        for r in res:
            if r['isMultipleChoice']:
                ret.append({'number':r['number'],'question':r['question'],'choices':r['choices']})
            else:
                ret.append({'number':r['number'],'question':r['question']})

        return jsonify(qa=ret,msg="success")
    except Exception as e:
        print(e)
        return jsonify(msg="failed")

@app.route("/study_timeline",  methods=['POST'])
def study_timeline():
    '''
    given some text and level of granularity, returns list of entities along with their index
    '''
    req = request.get_json(force=True)
    story_name = req['story_name']
    f = open('./static/data/story/'+story_name+ '.json')
    data = json.load(f)

    return jsonify(msg="success",entities = data['entities'], 
        timeline = data['timeline'], sentence_limits = list(data['sentence_limits'].values()),
        characters = data['characters'])

@app.route("/study_get_graph",  methods=['POST'])
def study_get_graph():

    req = request.get_json(force=True)
    story_name = req['story_name']
    f = open('./static/data/story/'+story_name+ '.json')
    data = json.load(f)
    
    return jsonify(edges = data['edges'])

@app.route("/study_wordcloud",  methods=['POST'])
def study_wordcloud():

    req = request.get_json(force=True)
    story_name = req['story_name']
    f = open('./static/data/story/'+story_name+ '.json')
    data = json.load(f)

    return jsonify(words = data['wordcloud']['words'], df= data['wordcloud']['df'])

@app.route("/calculate_distance", methods= ['POST'])
def calculate_distance():
    req = request.get_json(force=True)
    grp1 = req['grp1']
    grp2 = req['grp2']
    glove = ST.get_glove()
    dim = len(glove["he"])

    tmp = np.zeros((dim,), dtype=float)
    for w in grp1:
        if w in glove:
            w_vec = glove[w]/norm(glove[w])
            tmp = np.add(tmp,w_vec)
        else:
            print(w)
    dist1 = tmp/len(grp1)

    tmp = np.zeros((dim,), dtype=float)
    for w in grp2:
        if w in glove:
            w_vec = glove[w]/norm(glove[w])
            tmp = np.add(tmp,w_vec)
        else:
            print(w)
    dist2 = tmp/len(grp2)

    score = round(cosine(dist1, dist2),3)
    return jsonify(score = score)

# def extract_main_entity(text, char_ref):
#     for k in char_ref:
#         if text in k:
#             return k
#     return False

## -------------------- Utility Functions ----------------------
# def extract_main_entity(ent):
#     res = ""
#     for e in ent.ents:
#         # print(e, e.label_)
#         if e.label_ == "PERSON":
#             res = res + e.text + " "
#     return res.strip().replace("'d","").replace(".","").replace("'","")

def extract_main_entity(ent):
    res = ""
    for e in ent.ents:
        if e.label_ == "PERSON":
            res = res + e.text + " "
    if res=="":
        for t in ent:
            if t.pos_=="PROPN":
                print("Extra case Entity recognition: ", t)
                res = res + t.text + " "
    return res.strip().replace("'d","").replace(".","").replace("'","")

def split_by_paragraphs(txt, max_para = 1):
    limits = []
    for i, m in enumerate(re.finditer('\n\n', txt)):
        if i>0 and i%max_para==0: 
            limits.append(m.start())
    limits.append(len(txt))
    
    return limits

def dict_counter(dictionary, k):
    if k in dictionary:
        dictionary[k] += 1
    else:
        dictionary[k] = 1

    return dictionary

def delimiter(txt, doc, gran="sent"):
    '''
    # returns mapping for each token start index to unit index based on granualrity 
    # There are 3 possible values for granularity namely, para - paragraph, sent - sentence, CHAPTER - chapter
    '''
    limits = None
    if gran=="para":
        limits = [m.start() for m in re.finditer('\n\n', txt)]
    elif gran=="sent":
        limits = [sent.start_char for sent in doc.sents][1:]
    elif gran=="CHAPTER":
        limits = [m.start() for m in re.finditer(gran, txt)]
    
    # print(limits)
    # mapping a start ind of each token to granularity index
    res = {}
    limit_ind = 0
    for e in doc:
        if limit_ind<len(limits) and e.idx>limits[limit_ind]:
            limit_ind += 1
        res[e.idx] = limit_ind
    return res

# ---------------- Main computation -------------------------
@app.route("/timeline",  methods=['POST'])
def timeline():
    '''
    given some text and level of granularity, returns list of entities along with their index
    '''
    req = request.get_json(force=True)

    txt = req['txt'].strip()
    txt = re.sub(r'\W*Chapter \W*', ' ', txt)
    txt = txt.replace('   ', ' ')
    txt = txt.replace("“", '')

    user_defined = req['user_defined']
    splits = split_by_paragraphs(txt,10)

    print("user defined:", user_defined)

    ### iterace the splits and calculate character mentions
    st = 0
    docs = []
    sent_i = 0
    entities = {}
    res = []
    mapping = []
    full_mapping = []
    char_ref = {}
    ind = 0

    for end in splits:
        doc = nlp(txt[st:end])
        docs.append(doc)

        ## collect user defined entities
        i = 0
        mapping = []
        for sent in doc.sents:
            mapping.append(sent.start_char+st)
            # print("########")
            # print(sent)
            for c in user_defined:
                if  c in sent.text:
                    print("enter",c)
                    res.append({"name":c, "sentence":i+sent_i, "index": i+sent_i})
                    entities[c] = 1
                    # char_ref[st + ent.start_char] = main_ent
            i += 1
        # print("mapping", mapping)
        # mapping = [sent.start_char+st for sent in doc.sents]
        full_mapping.extend(mapping)
        for c in doc._.coref_clusters:
            main_ent = extract_main_entity(c.main)
            if len(main_ent)>0:
                for ent in c.mentions:
                    for i in range(len(mapping)):
                        m = mapping[i]
                        if ent.start_char+st > m:
                            ind = i+sent_i
                    res.append({"name":main_ent, "sentence":ind, "index": ind})
                    char_ref[st + ent.start_char] = main_ent
                    entities[main_ent] = 1

        sent_i += len(mapping)
        st = end + 1

    ## Save everything in the state
    ST.set_all(txt, splits, docs, char_ref)
    # print(res)

    return jsonify(msg="success",entities = entities, timeline = res, sentence_limits = full_mapping)

@app.route("/wordcloud",  methods=['POST'])
def wordcloud():
    '''
    # kind : 3 possible values; verb, adjective, both
    # returns dict with two keys 'words' and 'dist'
    # @words : dict with keys representing different entities and value as list of related words (verb, adjective or both)
    # @dist : list of pairs of entities along with their distnce score
    Example: char_ref = {'Harry':'Harry', 'Harry Potter':'Harry', 
                'Hermione': 'Hermione', 'Lupin': 'Lupin',
               'Sirius':'Sirius'}
    '''
    req = request.get_json(force=True)
    kind = req['kind']
    
    txt, splits, docs, char_ref  = ST.get_all()

     # get verbs and adjectives for each character
    verb = {}
    adjectives = {}
    words = {}

    st = 0
    for i in range(len(splits)):
        end = splits[i]
        doc = docs[i]
        # for t in doc:
        #     if t.dep == nsubj and t.head.pos == VERB:
        #         if st+t.idx in char_ref:
        #             clus_name = char_ref[st + t.idx]
        #             if clus_name not in verb:
        #                 verb[clus_name] = []
        #             verb[clus_name].append(t.head.lemma_)
        #             words = dict_counter(words,t.head.lemma_)

        #     elif t.dep == amod:
        #         if st + t.head.idx in char_ref:
        #             clus_name = char_ref[st + t.head.idx]
        #             if clus_name not in adjectives:
        #                 adjectives[clus_name] = []
        #             adjectives[clus_name].append(t.text)
        #             words = dict_counter(words,t.text)
        #     elif t.dep == acomp:
        #         for c in t.head.children:
        #             if st + c.idx in char_ref:
        #                 clus_name = char_ref[st + c.idx]
        #                 if clus_name not in adjectives:
        #                     adjectives[clus_name] = []
        #                 adjectives[clus_name].append(t.text)
        #                 words = dict_counter(words,t.text)
        #                 break

        for t in doc:
            if t.dep == nsubj and t.head.pos == VERB:
                if st+t.idx in char_ref:
                    clus_name = char_ref[st + t.idx]
                    if clus_name not in verb:
                        verb[clus_name] = []
                    verb[clus_name].append(t.head.lemma_)

            elif t.dep == amod and t.pos_ == "ADJ":
                if st + t.head.idx in char_ref:
                    clus_name = char_ref[st + t.head.idx]
                    if clus_name not in adjectives:
                        adjectives[clus_name] = []
                    adjectives[clus_name].append(t.text) 
            elif t.dep == acomp and t.pos_ == "ADJ":
                for c in t.head.children:
                    if st + c.idx in char_ref:
                        clus_name = char_ref[st + c.idx]
                        if clus_name not in adjectives:
                            adjectives[clus_name] = []
                        adjectives[clus_name].append(t.text)
                        break
            
            # finding nouns for adjectives which don't fall in amod or acomp
            elif t.pos_ == "ADJ":    
                w = t
                noun = ""
                found = False
                while not found:
                    if st + w.head.idx in char_ref: 
                        noun = w.head
                        found = True
                        break
                    else:
                        for c in w.head.children:
                            if st + c.idx in char_ref:
                                noun = c
                                found = True
                                break
                    # reached the root node
                    if w.text==w.head.text:
                        break
                    w = w.head
                    
                if type(noun)!=str:
                    # print(t, noun)
                    clus_name = char_ref[st + noun.idx]
                    if clus_name not in adjectives:
                        adjectives[clus_name] = []
                    adjectives[clus_name].append(t.text)
                    # print(t, clus_name)
                else:
                    print(t, t.idx, " Not Found")

        st = end + 1
                    
    res = {}
    if kind=="verb":
        res["words"] = verb
    elif kind=="adjective":
        res["words"] = adjectives
    elif kind=="both":
        both = verb.copy()
        for k in adjectives:
            if k in both:
                tmp = both[k]
            else:
                tmp = []
            tmp.extend(adjectives[k])
            both[k] = tmp
        res["words"] = both
#     res["dist"] = distance_Wordcloud(res["words"])
    return jsonify(words = res, df= words)

# @input: disctionary with keys as entities and values as list of related words
# returns list of pairs of entites which are most distant as per the word embeddings of their characteristic words
@app.route("/distance_wordcloud",  methods=['POST'])
def distance_wordcloud():
    req = request.get_json(force=True)
    data = req['data']
    characters = req['characters']

    glove = ST.get_glove()
    dim = len(glove["he"])
    ent_vec = {}
    for ent in characters:
        if ent['name'] in data:
            words = data[ent['name']]
            if 'alias' in ent:
                for a in ent['alias']:
                    if a in words:
                        words.extend(data[a])

            if len(words) > 15:
                tmp = np.zeros((dim,), dtype=float)
                for w in words:
                    if w in glove:
                        w_vec = glove[w]/norm(glove[w])
                        tmp = np.add(tmp,w_vec)
                ent_vec[ent['name']] = tmp/len(words)
     
    pairs_dist = []
    for e1, e2 in itertools.combinations(list(ent_vec.keys()),2):
        e1_vec, e2_vec = ent_vec[e1], ent_vec[e2]
        score = round(cosine(e1_vec, e2_vec),3)
        if score >= 0.4:
            pairs_dist.append({'e1':e1, 'e2':e2, 'score': score, 'type':'characters'})
        # pairs_dist.append((e1+"--"+e2, round(cosine(e1_vec, e2_vec),3)))
    
    # pairs_dist.sort(key=lambda x: x[1], reverse=True)
    return jsonify(pairs = pairs_dist)

# @input
# txt - input text
# char_ref - dictionary key: starting index, value: entity
# output
# char_mapping: dictionary with key: character_name, value:its id
# edges: co-occurence matrix 
@app.route("/get_graph",  methods=['POST'])
def get_graph():

    req = request.get_json(force=True)
    alias_dict = req['alias_dict']
    characters = req['characters']
    print(characters)

    txt, splits, docs, char_ref  = ST.get_all()

    st = 0
    sent_i = 0
    edges = []
    for i in range(len(splits)):
        end = splits[i]
        doc = docs[i]
        
        for sent in doc.sents:
            edges.append(set())
            for t in sent:
                if st+t.idx in char_ref:
                    ent = char_ref[st + t.idx]
                    if (ent in characters) or (ent in alias_dict):
                        if ent in alias_dict:
                            ent = alias_dict[ent]
                        edges[sent_i].add(ent)
                    
            sent_i += 1

        st = end + 1

    res = []
    for entry in edges:
        if len(entry) > 1:
            for (c1,c2) in itertools.combinations(entry,2):
                res.append({"source": c1, "target": c2, "value": 1})
    
    return jsonify(edges = res)
# ---------------- Save/delete projects ---------------------
@app.route("/saveContents",  methods=['POST'])
def saveContents():
    '''
    save QuillJS contens
    '''
    # req = request.get_json(force=True)
    # doc = req['doc']
    # name = req['name']
    # # print(doc)
    # try:
    #     projects = mongo.db.projects
    #     projects.update_one({'email': session['email'],'project_name': name},{
    #         '$set':{'email': session['email'],'project_name': name, 'doc':doc}},upsert=True)
    # except Exception as e:
    #     print(e)

    return jsonify(msg="success")

@app.route("/delete_project",  methods=['POST'])
def delete_project():
    '''
    delete project
    '''
    req = request.get_json(force=True)
    name = req['name']
    try:
        projects = mongo.db.projects
        projects.delete_one({'email': session['email'],'project_name': name})
    except Exception as e:
        print(e)

    return jsonify(msg="success")

@app.route("/saveLogs",  methods=['POST'])
def saveLogs():
    '''
    save Logs
    '''
    # req = request.get_json(force=True)
    # user_logs = req['logs']
    # name = req['name']
    # # print(doc)
    # try:
    #     logs = mongo.db.logs
    #     logs.insert_one({'email': session['email'],'project_name': name, 'logs':user_logs})
    # except Exception as e:
    #     print(e)

    return jsonify(msg="success")
#------------------- Login, Logout, Signup Routes -----------------
@app.route("/register", methods=['GET', 'POST'])
def register():
    global current_user_id
    form = RegistrationForm()
    if form.validate_on_submit():
        try:
            user = mongo.db.user
            user.insert_one({'email': form.email.data, 'password': form.password.data, 'user_group': 'participant'})
            session['email'] = form.email.data
            user_dict = mongo.db.user
            user = user_dict.find_one({'email': form.email.data})
            current_user_id = user['_id']
        except Exception as e:
            print(e)
            flash(f'User Already exists!!!', 'primary')
            return redirect(url_for('register'))
        flash(f'Account created for {form.email.data}!', 'success')
        return redirect(url_for('home'))
    return render_template('register.html', title='Register', form=form)


@app.route("/login", methods=['GET', 'POST'])
def login():
    global current_user_id
    form = LoginForm()
    if form.validate_on_submit():
        user_dict = mongo.db.user
        user = user_dict.find_one({'email': form.email.data})
        if user and form.password.data == user['password']:
            current_user_id = user['_id']
            session['email'] = form.email.data
            # flash('You have been logged in!', 'success')
            return redirect(url_for('home'))
        else:
            flash('Login Unsuccessful. Please check username and password', 'danger')
    return render_template('login.html', title='Login', form=form)

@app.route("/logout")
def logout():
    session.pop("email",None)
    return redirect(url_for('welcome'))

if __name__ == "__main__":
    hostname = socket.gethostname()
    # If we are running this script on the remote server
    if hostname=='ubuntuedge1':
        app.run(host= '0.0.0.0', port=3000, debug=True)
    else:
        app.run(port=5000, debug=True)
