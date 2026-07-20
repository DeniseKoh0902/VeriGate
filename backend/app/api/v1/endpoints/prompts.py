from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi import status as http_status
from fastapi.responses import Response

from app.core.dependencies import get_current_user
from app.schemas.prompt import (
    AvailableModelOut,
    ChatSessionOut,
    PromptHistoryItem,
    PromptSubmitRequest,
    PromptSubmitResponse,
)
from app.schemas.user import UserOut
from app.services import attachment_service, prompt_service
from app.services.attachment_service import AttachmentInput

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.post("", response_model=PromptSubmitResponse)
async def submit_prompt(
    aiToolName: str = Form(...),
    promptText: str = Form(...),
    sessionId: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    current_user: UserOut = Depends(get_current_user),
) -> PromptSubmitResponse:
    # Real uploads always carry a filename; an empty file input still submits
    # one UploadFile with filename="" in some browsers, so this filters that
    # out rather than treating it as a zero-byte attachment.
    uploads = [f for f in files if f.filename]

    if len(uploads) > attachment_service.MAX_FILES_PER_PROMPT:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"You can attach at most {attachment_service.MAX_FILES_PER_PROMPT} files per message.",
        )

    attachments: list[AttachmentInput] = []
    for upload in uploads:
        mime_type = upload.content_type or "application/octet-stream"
        if mime_type not in attachment_service.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f'"{upload.filename}" is a {mime_type} file, which isn\'t a supported attachment type.',
            )
        data = await upload.read()
        if len(data) > attachment_service.MAX_FILE_SIZE_BYTES:
            limit_mb = attachment_service.MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f'"{upload.filename}" exceeds the {limit_mb}MB attachment size limit.',
            )
        attachments.append(
            AttachmentInput(file_name=upload.filename, mime_type=mime_type, data=data)
        )

    payload = PromptSubmitRequest(aiToolName=aiToolName, promptText=promptText, sessionId=sessionId)
    return await prompt_service.submit_prompt(payload, current_user.id, attachments=attachments)


@router.get("/available-models", response_model=list[AvailableModelOut])
async def get_available_models(
    current_user: UserOut = Depends(get_current_user),
) -> list[AvailableModelOut]:
    return await prompt_service.list_available_models()


# Static "/sessions" is registered ahead of the dynamic "/sessions/{session_id}"
# path below it, so a session id can never shadow it.
@router.get("/sessions", response_model=list[ChatSessionOut])
async def get_chat_sessions(
    current_user: UserOut = Depends(get_current_user),
) -> list[ChatSessionOut]:
    return await prompt_service.list_chat_sessions(current_user.id)


@router.get("/sessions/{session_id}", response_model=list[PromptHistoryItem])
async def get_chat_session_messages(
    session_id: str, current_user: UserOut = Depends(get_current_user)
) -> list[PromptHistoryItem]:
    return await prompt_service.get_session_messages(session_id, current_user.id)


@router.get("/attachments/{attachment_id}")
async def get_attachment_file(
    attachment_id: str, current_user: UserOut = Depends(get_current_user)
) -> Response:
    attachment = await prompt_service.get_attachment_file(
        attachment_id, current_user.id, is_admin=current_user.role == "ADMIN"
    )
    return Response(
        content=attachment["fileData"],
        media_type=attachment["mimeType"],
        headers={"Content-Disposition": f'inline; filename="{attachment["fileName"]}"'},
    )
