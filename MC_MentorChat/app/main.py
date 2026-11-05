from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as api_router
from app.rag.qdrant_service import init_qdrant

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo Qdrant collection và Indexes khi server khởi động
    try:
        init_qdrant()
        print(">> [Qdrant] Khởi tạo Vector Store & Indexes thành công!")
    except Exception as e:
        print(f">> [Qdrant Warning ] không thể kết nối Qdrant: {e}")
    yield

app = FastAPI(
    title="MC E-learnign AI Mentor Chat Service",
    description="Microservice RAG cô lập theo khóa học (PDF + Video Transcripts)",
    version="1.0.0",
    lifespan=lifespan   
)

#Cho phép gọi CORS từ web FE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
@app.get("/")
def health_check():
    return {"status": "ok", "service": "MC_MentorChat is running"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
