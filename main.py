import os
import re
import json
import httpx
import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI

app = FastAPI()

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Secure Environment Variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "Ewm24k")
GITHUB_REPO = os.getenv("GITHUB_REPO", "smartkiddo-verse")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client securely
openai_client = None
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

# -----------------------------------------------------------------
# Models for API validation
# -----------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    workspace_context: Optional[str] = ""

# Request schema for the Bedtime Story pipeline
class BedtimeStoryRequest(BaseModel):
    concept_brief: str
    age_group: str
    voice_style: str
    visual_style: str
    story_length: str
    music_mood: str

# -----------------------------------------------------------------
# Helper Utilities
# -----------------------------------------------------------------

# Helper to request GitHub REST API
async def github_request(endpoint: str, method: str = "GET", json_data: dict = None):
    url = f"https://api.github.com{endpoint}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "SmartKiddo-Sync-API-Python"
    }
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=json_data)
        elif method == "PATCH":
            response = await client.patch(url, headers=headers, json=json_data)
        
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# Helper to recursively gather all files needing text hydration [2]
def collect_code_files(nodes):
    files = []
    for node in nodes:
        if node["type"] == "file" and not node.get("isMedia"):
            files.append(node)
        elif node["type"] == "folder" and "children" in node:
            files.extend(collect_code_files(node["children"]))
    return files

# Helper to asynchronously fetch a single file content from raw GitHub link [2]
async def fetch_single_file(client, node, headers, repo_name: str):
    raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{repo_name}/{GITHUB_BRANCH}/{node['path']}"
    try:
        response = await client.get(raw_url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            node["content"] = response.text
        else:
            node["content"] = f"/* Error loading content: {response.status_code} */"
    except Exception as e:
        node["content"] = f"/* Exception loading content: {str(e)} */"

# Helper to extract JSON from OpenAI responses securely (handling formatting blocks)
def extract_json_content(text: str) -> dict:
    try:
        # Search for content inside markdown code blocks
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        if match:
            return json.loads(match.group(1).strip())
        
        match_code = re.search(r"```\s*([\s\S]*?)\s*```", text)
        if match_code:
            return json.loads(match_code.group(1).strip())
            
        # Fallback to general direct conversion
        return json.loads(text.strip())
    except Exception as parse_error:
        print("JSON extraction parsing failed, utilizing emergency fallback layout. Error:", str(parse_error))
        # Build structure fallback in case AI outputs irregular raw text
        return {
            "title": "A Magical Forest Adventure",
            "brief": "A charming, relaxing story tailored directly to curiosity and bedtime comfort.",
            "script": text
        }

# -----------------------------------------------------------------
# Endpoint 1: Sync (GET) - Pull repository structure
# -----------------------------------------------------------------
@app.get("/api/sync")
async def sync_github(repo: Optional[str] = None):
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="Missing GITHUB_TOKEN on backend.")
    try:
        # Determine active target repository [1]
        repo_name = repo if repo else GITHUB_REPO

        # Fetch the flat recursive Git tree from GitHub
        tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/trees/{GITHUB_BRANCH}?recursive=1")
        
        # Pull all source files without exclusion filters (excluding only system compiled assets)
        filtered_tree = [
            item for item in tree_data.get("tree", [])
            if not item["path"].startswith(".") and 
               "node_modules/" not in item["path"] and
               "__pycache__/" not in item["path"] and
               not item["path"].endswith(".pyc")
        ]

        root_nodes = []
        nodes_by_path = {}

        # Sort so parent directories are processed before their nested files [1]
        sorted_tree = sorted(filtered_tree, key=lambda x: x["path"])

        # Dynamic Nesting Tree Builder
        for item in sorted_tree:
            parts = item["path"].split("/")
            is_folder = item["type"] == "tree"
            
            current_path = ""
            parent_node = None
            
            for i, part in enumerate(parts):
                current_path = f"{current_path}/{part}" if current_path else part
                is_last = (i == len(parts) - 1)
                
                if current_path not in nodes_by_path:
                    # Create the node dynamically to preserve 100% accurate file positions [1]
                    node_id = f"gh_{item['sha']}" if is_last else f"gen_{current_path}"
                    node_type = "folder" if (not is_last or is_folder) else "file"
                    
                    new_node = {
                        "id": node_id,
                        "name": part,
                        "type": node_type,
                        "path": current_path
                    }
                    
                    if node_type == "folder":
                        new_node["isOpen"] = True
                        new_node["children"] = []
                    else:
                        ext = part.split(".")[-1].lower() if "." in part else ""
                        is_media = ext in ["png", "jpg", "jpeg", "gif", "svg", "webp", "mp4", "webm", "ogg"]
                        new_node["isMedia"] = is_media
                        if is_media:
                            new_node["format"] = "video" if ext in ["mp4", "webm", "ogg"] else "image"
                            new_node["url"] = f"/api/media?path={current_path}&repo={repo_name}"
                            new_node["content"] = ""
                        else:
                            new_node["content"] = ""
                    
                    nodes_by_path[current_path] = new_node
                    
                    # Append node directly to root or its parent folder
                    if parent_node is None:
                        root_nodes.append(new_node)
                    else:
                        parent_node["children"].append(new_node)
                
                parent_node = nodes_by_path[current_path]

        # Retrieve and hydrate all file content concurrently using asyncio.gather [2]
        code_files = collect_code_files(root_nodes)
        if code_files:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
                # Create and schedule concurrent tasks, passing active repository target [1]
                tasks = [fetch_single_file(client, node, headers, repo_name) for node in code_files]
                await asyncio.gather(*tasks)

        # Strip temporary path parameter before responding
        def strip_paths(nodes):
            for node in nodes:
                if "path" in node:
                    del node["path"]
                if "children" in node:
                    strip_paths(node["children"])
        strip_paths(root_nodes)

        return root_nodes
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 2: Send & Sync (POST) - Push workspace back to GitHub
# -----------------------------------------------------------------
@app.post("/api/send-sync")
async def send_sync_github(request: Request, repo: Optional[str] = None):
    try:
        file_system = await request.json()
        if not isinstance(file_system, list):
            raise HTTPException(status_code=400, detail="Invalid payload. Array expected.")

        # Determine active target repository [1]
        repo_name = repo if repo else GITHUB_REPO

        # Flatten nested structure to path mappings
        def flatten(nodes, current_path=""):
            flat_list = []
            for node in nodes:
                absolute_path = f"{current_path}/{node['name']}" if current_path else node['name']
                if node["type"] == "file":
                    flat_list.append({
                        "path": absolute_path,
                        "content": node.get("content", ""),
                        "isMedia": node.get("isMedia", False)
                    })
                elif node["type"] == "folder" and "children" in node:
                    flat_list.extend(flatten(node["children"], absolute_path))
            return flat_list

        flattened_files = flatten(file_system)

        # Fetch HEAD commit context
        ref_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/refs/heads/{GITHUB_BRANCH}")
        base_commit_sha = ref_data["object"]["sha"]

        # Retrieve tree SHA
        commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/commits/{base_commit_sha}")
        base_tree_sha = commit_data["tree"]["sha"]

        # Build git Tree payload (skip binary media uploads)
        tree_items = [
            {
                "path": file["path"],
                "mode": "100644",
                "type": "blob",
                "content": file["content"]
            }
            for file in flattened_files if not file["isMedia"]
        ]

        new_tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/trees", "POST", {
            "base_tree": base_tree_sha,
            "tree": tree_items
        })

        # Create new Commit
        new_commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/commits", "POST", {
            "message": "Backup update from SmartKiddo Studio Workspace",
            "tree": new_tree_data["sha"],
            "parents": [base_commit_sha]
        })

        # Update branch head reference
        await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/refs/heads/{GITHUB_BRANCH}", "PATCH", {
            "sha": new_commit_data["sha"],
            "force": True
        })

        return {"success": True, "sha": new_commit_data["sha"]}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 3: Secure Media Stream Proxy
# -----------------------------------------------------------------
@app.get("/api/media")
async def stream_media(path: str, repo: Optional[str] = None):
    if not path:
        raise HTTPException(status_code=400, detail="Missing path parameter")
    try:
        # Determine active target repository [1]
        repo_name = repo if repo else GITHUB_REPO

        raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{repo_name}/{GITHUB_BRANCH}/{path}"
        headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(raw_url, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch asset")
            
            from fastapi.responses import Response
            return Response(content=response.content, media_type=response.headers.get("content-type"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 4: AI Agent Chat Integration (With advanced memory parsing) [2]
# -----------------------------------------------------------------
@app.post("/api/chat")
async def ai_chat_completion(chat_req: ChatRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Please configure OPENAI_API_KEY environment variable on Render.", "success": False}
    try:
        openai_input_str = ""
        
        # Inject Active Workspace Manifest & LRU Session File Cache [2]
        if chat_req.workspace_context:
            openai_input_str += f"=== ACTIVE WORKSPACE MANIFEST && SESSION FILE CACHE ===\n{chat_req.workspace_context}\n\n"
            
        openai_input_str += "=== CONVERSATION HISTORY ===\n"
        
        # Iterate over all messages except the latest one [2]
        for msg in chat_req.messages[:-1]:
            speaker = "User" if msg.role == "user" else "Assistant"
            openai_input_str += f"{speaker}: {msg.content}\n"

        # Inject the Context Tracker Instruction Layer right before the latest user message [2]
        openai_input_str += "\n=== CONTEXT TRACKER INSTRUCTIONS ===\n"
        openai_input_str += "Please analyze the entire conversation history above to follow references correctly:\n"
        openai_input_str += "- Track shifting topics or multiple topics within a single query.\n"
        openai_input_str += "- Resolve pronouns ('it', 'this', 'them') based on previously mentioned files/code.\n"
        openai_input_str += "- Parse numerical options.\n"
        openai_input_str += "- Remember code or directory layouts shown in earlier turns. Synthesize your answer contextually.\n\n"

        # AUTONOMOUS AGENT ACTIONS (INJECTED SYSTEM INSTRUCTIONS)
        openai_input_str += "=== AGENT TOOL EMISSION RULES ===\n"
        openai_input_str += "You are an autonomous administrative software agent with full permissions over the developer workspace [1.2.3, 1.2.4].\n"
        openai_input_str += "If you cannot answer a user's question because you don't have a file's content, or if you need to search the codebase, you MUST trigger one or more of your background tools using XML-like text tags. You can trigger multiple tags in a single message turn.\n\n"
        openai_input_str += "Available tools:\n"
        openai_input_str += "1. Read File Content:\n"
        openai_input_str += "   <read_file path=\"relative/path/to/file\"></read_file>\n"
        openai_input_str += "   Reads the full source code text of any file listed in the manifest index.\n"
        openai_input_str += "2. Grep Codebase Search:\n"
        openai_input_str += "   <grep_search query=\"search_term\"></grep_search>\n"
        openai_input_str += "   Scans through all code files in the repository and retrieves matching line numbers and snippets.\n\n"
        openai_input_str += "Rule Parameters:\n"
        openai_input_str += "- DO NOT make up, guess, or hallucinate file content. If a file is not in the Session LRU cache, use `<read_file>`.\n"
        openai_input_str += "- When you emit a tool tag, STOP writing immediately after it. Do not attempt to explain the code or answer before the client returns the actual results in the next turn.\n"
        openai_input_str += "- You can request multiple files simultaneously.\n\n"

        # Append the latest user message context
        if len(chat_req.messages) > 0:
            latest_msg = chat_req.messages[-1]
            openai_input_str += f"=== LATEST USER MESSAGE ===\nUser: {latest_msg.content}\n"

        # Trigger Saved Prompt Template [2]
        response = openai_client.responses.create(
            model="gpt-5.4-mini", 
            prompt={
                "id": "pmpt_6a64c46b5e5c8190bdb0b6f7aacbb7450b1160d1c16e4e6e",
                "version": "1"
            },
            input=openai_input_str, # String input conforms strictly to schema validation [2]
            reasoning={
                "mode": "standard",
                "summary": "auto"
            },
            tools=[
                {
                    "type": "web_search",
                    "user_location": {
                        "type": "approximate"
                    },
                    "search_context_size": "high"
                }
            ],
            store=True,
            include=[
                "reasoning.encrypted_content",
                "web_search_call.action.sources"
            ]
        )

        # Access assistant response
        assistant_content = ""
        if hasattr(response, "output_text") and response.output_text:
            assistant_content = response.output_text
        elif hasattr(response, "choices") and len(response.choices) > 0:
            assistant_content = response.choices[0].message.content
        elif hasattr(response, "output") and hasattr(response.output, "content"):
            assistant_content = response.output.content

        # Error-Proof Token Usage extraction utilizing safe attribute checks [2]
        input_tokens = 0
        output_tokens = 0
        total_tokens = 0
        
        if hasattr(response, "usage") and response.usage:
            input_tokens = getattr(response.usage, "input_tokens", None)
            if input_tokens is None:
                input_tokens = getattr(response.usage, "prompt_tokens", 0) or 0
                
            output_tokens = getattr(response.usage, "output_tokens", None)
            if output_tokens is None:
                output_tokens = getattr(response.usage, "completion_tokens", 0) or 0
                
            total_tokens = getattr(response.usage, "total_tokens", input_tokens + output_tokens) or (input_tokens + output_tokens)
        else:
            input_tokens = len(openai_input_str) // 4
            output_tokens = len(assistant_content) // 4
            total_tokens = input_tokens + output_tokens

        return {
            "content": assistant_content,
            "success": True,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        }
    except Exception as e:
        print("OpenAI Error:", str(e))
        return {"error": str(e), "success": False}

# -----------------------------------------------------------------
# Endpoint 5: Bedtime Story AI concept & script generator
# -----------------------------------------------------------------
@app.post("/api/bedtime-story/generate")
async def generate_bedtime_story(story_req: BedtimeStoryRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Ensure OPENAI_API_KEY environment variable is active on Render.", "success": False}
    try:
        # Build structured input details mapping user configurations
        openai_input_str = (
            f"=== BEDTIME STORY GENERATION PARAMS ===\n"
            f"Theme Concept Brief: {story_req.concept_brief}\n"
            f"Target Age Group: {story_req.age_group} years old\n"
            f"Narrative Voice Selection: {story_req.voice_style}\n"
            f"Graphic Illustration Style: {story_req.visual_style}\n"
            f"Story Length Constraints: {story_req.story_length}\n"
            f"Music Soundtrack Mood: {story_req.music_mood}\n\n"
            f"=== CORE INSTRUCTIONS ===\n"
            f"You are a master children's book author. Draft a magical, engaging bedtime story that matches all parameter requirements above.\n"
            f"To satisfy strict application routing layers, your output MUST be formatted exactly as raw JSON using these keys:\n"
            f"- 'title': A charming, original book title\n"
            f"- 'brief': A short, enticing 2-sentence synopsis summarizing the concept brief (Step 1)\n"
            f"- 'script': The complete, detailed story narrative parsed into readable sleep-time paragraphs (Step 2)\n\n"
            f"Do not write conversational intro/outro wrappers. Respond strictly with raw JSON conforming to this schema:\n"
            f"{{\n"
            f"  \"title\": \"...\",\n"
            f"  \"brief\": \"...\",\n"
            f"  \"script\": \"...\"\n"
            f"}}\n"
        )

        # Call OpenAI Platform Responses API with targeted template ID [2]
        response = openai_client.responses.create(
            model="gpt-5.4-mini", 
            prompt={
                "id": "pmpt_6a662bd8afd08194a20f18967be4326908f6e34aa8074ea1",
                "version": "1"
            },
            input=openai_input_str, # Conform strictly to input schema properties [2]
            reasoning={
                "mode": "standard",
                "summary": "auto"
            },
            store=True,
            include=[
                "reasoning.encrypted_content",
                "web_search_call.action.sources"
            ]
        )

        # Safely extract generated raw content from API response object
        ai_raw_content = ""
        if hasattr(response, "output_text") and response.output_text:
            ai_raw_content = response.output_text
        elif hasattr(response, "choices") and len(response.choices) > 0:
            ai_raw_content = response.choices[0].message.content
        elif hasattr(response, "output") and hasattr(response.output, "content"):
            ai_raw_content = response.output.content

        # Parse AI raw content wrapper into clean JSON dictionary values
        story_json_data = extract_json_content(ai_raw_content)

        return {
            "success": True,
            "title": story_json_data.get("title", "The Whispering Meadow"),
            "brief": story_json_data.get("brief", "An enchanting, peaceful exploration concept summary."),
            "script": story_json_data.get("script", ai_raw_content)
        }

    except Exception as e:
        print("Bedtime Story Generation Failure:", str(e))
        return {"error": str(e), "success": False}
