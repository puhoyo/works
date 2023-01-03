#pragma once

#include <WinSock2.h>

namespace IocpGameServer {
	// 헤더 의존성 제거
	class Application;


	// 경고 메시지를 전달하는 패킷 수 리미트
	static const char kWarningPacketCount = 5;
	// 강제로 연결을 끊는 패킷 수 리미트
	static const char kMaximumPacketCount = 7;

	// 기본 IO 처리 핸들러
	DWORD IOCPThreadMain(LPVOID iocp, std::shared_ptr<Application> app);

	// 클라이언트에서 패킷을 보낼 때 마다 패킷 카운트를 체크하여
	// 패킷을 너무 자주 보낼 경우 경고 메시지를 보냄
	// return value: 최대 허용량을 초과할 경우 true, otherwise false.
	const bool CheckTooManyPackets(std::shared_ptr<Socket> socket);

} //namespace IocpGameServer