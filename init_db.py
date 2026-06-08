import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

schemas = ['professors', 'polls', 'votes']

for schema in schemas:
    path = os.path.join(DATA_DIR, f'db_{schema}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump([], f)
    print(f'초기화 완료: {path}')

print('\nDB 초기화가 완료되었습니다.')
