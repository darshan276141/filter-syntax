import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from joblib import dump
from sklearn.preprocessing import OneHotEncoder

# Example dataset
data = {
    'file_type': ['js', 'py', 'js', 'html', 'css', 'py'],
    'keyword_count': [5, 2, 3, 7, 1, 4],
    'line_count': [10, 15, 8, 20, 5, 12],
    'comment_ratio': [0.1, 0.2, 0.05, 0.1, 0.3, 0.15],
    'unused_imports': [1, 0, 1, 0, 0, 1],
    'user_applied_filter': [1, 0, 1, 1, 0, 0]
}

df = pd.DataFrame(data)

# One-hot encode file_type
encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
file_type_encoded = encoder.fit_transform(df[['file_type']])
encoded_cols = encoder.get_feature_names_out(['file_type'])
df_encoded = pd.DataFrame(file_type_encoded, columns=encoded_cols)

# Combine features
X = pd.concat([df[['keyword_count', 'line_count', 'comment_ratio', 'unused_imports']], df_encoded], axis=1)
y = df['user_applied_filter']

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X, y)

# Save model and encoder
dump(model, 'filter_model.joblib')
dump(encoder, 'encoder.joblib')
print("Model and encoder trained and saved!")
