import re
import os
import sys

TODO_PATH = ".antigravity/kanban/todo.md"
DONE_PATH = ".antigravity/kanban/done.md"

def extract_task_ids(file_path):
    if not os.path.exists(file_path):
        return []
    
    ids = []
    task_regex = re.compile(r"\[TASK-(\d+)\]")
    
    with open(file_path, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            matches = task_regex.findall(line)
            for match in matches:
                ids.append((int(match), line.strip(), line_num))
    return ids

def main():
    print("Iniciando auditoria de identificadores de tarefas...")
    
    todo_tasks = extract_task_ids(TODO_PATH)
    done_tasks = extract_task_ids(DONE_PATH)
    
    all_tasks = todo_tasks + done_tasks
    task_ids = [t[0] for t in all_tasks]
    
    # 1. Verificar duplicados
    duplicates = set([x for x in task_ids if task_ids.count(x) > 1])
    
    if duplicates:
        print("\n[ERRO] Encontrados IDs de tarefas duplicados!")
        for dup in sorted(duplicates):
            print(f"\nConflito no ID: TASK-{dup:03d}")
            occurrences = [t for t in all_tasks if t[0] == dup]
            for val, text, line in occurrences:
                print(f"  - Linha {line}: {text}")
        sys.exit(1)
        
    print("\n[SUCESSO] Nenhum ID duplicado encontrado.")
    
    # 2. Exibir resumo e maior ID
    if task_ids:
        max_id = max(task_ids)
        print(f"Total de tarefas rastreadas: {len(task_ids)}")
        print(f"Maior ID registrado: TASK-{max_id:03d}")
        print(f"Próximo ID sugerido para nova tarefa: TASK-{(max_id + 1):03d}")
    else:
        print("Nenhuma tarefa encontrada no backlog.")
    
    sys.exit(0)

if __name__ == "__main__":
    main()
