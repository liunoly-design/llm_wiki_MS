import os
import shutil
import sys

def main():
    # 接收目标 Wiki 目录路径，默认从环境变量或相对路径读取
    wiki_dir = os.environ.get('WIKI_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../Digital Brain Wiki')))
    
    if not os.path.exists(wiki_dir):
        print(f"Error: Wiki directory not found at {wiki_dir}")
        sys.exit(1)
        
    print(f"Starting structure fix in: {wiki_dir}")
    
    # 1. 修复根目录游离的 420_Schemas
    src_schemas = os.path.join(wiki_dir, '420_Schemas')
    dest_schemas = os.path.join(wiki_dir, '400_System_Kernel', '420_Schemas')
    
    if os.path.exists(src_schemas):
        print(f"Fixing stray directory: {src_schemas} -> {dest_schemas}")
        if not os.path.exists(dest_schemas):
            os.makedirs(os.path.dirname(dest_schemas), exist_ok=True)
            shutil.move(src_schemas, dest_schemas)
            print("Successfully moved 420_Schemas.")
        else:
            # 如果目标目录已经存在，则移动内容
            for item in os.listdir(src_schemas):
                s = os.path.join(src_schemas, item)
                d = os.path.join(dest_schemas, item)
                if not os.path.exists(d):
                    shutil.move(s, d)
            shutil.rmtree(src_schemas)
            print("Successfully merged 420_Schemas contents.")

    # 2. 修复 200_Wiki_Graph 下的 QA 和 QA_Engineering
    qa_dir = os.path.join(wiki_dir, '200_Wiki_Graph', 'QA')
    qa_eng_dir = os.path.join(wiki_dir, '200_Wiki_Graph', 'QA_Engineering')
    new_qa_dir = os.path.join(wiki_dir, '200_Wiki_Graph', '260_QA_Engineering')

    if os.path.exists(qa_dir) or os.path.exists(qa_eng_dir):
        print(f"Fixing Wiki_Graph QA directories -> {new_qa_dir}")
        os.makedirs(new_qa_dir, exist_ok=True)
        
        if os.path.exists(qa_dir):
            for item in os.listdir(qa_dir):
                shutil.move(os.path.join(qa_dir, item), os.path.join(new_qa_dir, item))
            shutil.rmtree(qa_dir)
            
        if os.path.exists(qa_eng_dir):
            for item in os.listdir(qa_eng_dir):
                shutil.move(os.path.join(qa_eng_dir, item), os.path.join(new_qa_dir, item))
            shutil.rmtree(qa_eng_dir)
        print("Successfully merged QA directories.")

    # 3. 修复 300_Projects 下的 Wiki_2.0_Design_Practice
    proj_dir = os.path.join(wiki_dir, '300_Projects', 'Wiki_2.0_Design_Practice')
    new_proj_dir = os.path.join(wiki_dir, '300_Projects', '350_Wiki_2.0_Design_Practice')
    
    if os.path.exists(proj_dir) and not os.path.exists(new_proj_dir):
        print(f"Fixing Project directory: {proj_dir} -> {new_proj_dir}")
        shutil.move(proj_dir, new_proj_dir)
        print("Successfully renamed Wiki_2.0_Design_Practice.")

    # 4. 修复 400_System_Kernel/AGENTS.md
    agents_src = os.path.join(wiki_dir, '400_System_Kernel', 'AGENTS.md')
    agents_dest = os.path.join(wiki_dir, '400_System_Kernel', '420_Schemas', 'AGENTS.md')
    
    if os.path.exists(agents_src) and not os.path.exists(agents_dest):
        print(f"Fixing AGENTS.md location: {agents_src} -> {agents_dest}")
        os.makedirs(os.path.dirname(agents_dest), exist_ok=True)
        shutil.move(agents_src, agents_dest)
        print("Successfully moved AGENTS.md.")

    print("Structure fix completed successfully.")

if __name__ == "__main__":
    main()