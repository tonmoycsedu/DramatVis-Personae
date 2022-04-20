class State:
	'''docstring for State'''
	def __init__(self):
		self.text = ""
		self.splits = []
		self.docs = []
		self.char_ref = {}
	
	'''Set Functions'''
	def set_glove(self, glove):
		self.glove = glove

	def set_text(self, text):
		self.text = text

	def set_splits(self, splits):
		self.splits = splits

	def set_docs(self, docs):
		self.docs = docs

	def set_char_ref(self, char_ref):
		self.char_ref = char_ref
	
	def set_all(self, text, splits, docs, char_ref):
		self.text = text
		self.splits = splits
		self.docs = docs
		self.char_ref = char_ref

	'''Get Functions'''
	def get_glove(self):
		return self.glove
		
	def get_text(self):
		return self.text

	def get_splits(self):
		return self.splits

	def get_docs(self):
		return self.docs

	def get_char_ref(self):
		return self.char_ref

	def get_all(self):
		return self.text, self.splits, self.docs, self.char_ref