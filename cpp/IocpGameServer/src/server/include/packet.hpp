#pragma once

#include <WinSock2.h>
#include <string>

namespace IocpGameServer {
	// IO info
	// 생성 후 Send/Receive 할 때 사용
	// 삭제는 IO Complete 시 해당 핸들러에서 데이터 사용 후 삭제
	class Packet {
		enum { kRecvSize = 128, kSendSize = 1024 };
		OVERLAPPED overlapped_;
		WSABUF wsa_buf_;
		const int kRwMode;
	public:
		// read 모드 패킷을 생성
		Packet();

		// wrtie 모드 패킷을 생성
		// parameter data의 첫 번째 바이트는 프로토콜 정보
		Packet(const std::string& data);

		~Packet() { delete wsa_buf_.buf; }

		enum { kReadMode = 1, kWriteMode };

		// 패킷의 read/write 모드를 가져온다.
		const int GetRwMode() const { return kRwMode; }

		// 패킷에서 API 프로토콜 정보를 가져온다.
		const unsigned char GetProtocol() const { return wsa_buf_.buf[0]; }

		// 패킷에서 데이터를 가져온다.
		std::string GetPacketData() const;

		// Send/Receive 시 요구되는 WSABUF의 주소값을 가져온다.
		WSABUF* GetBufferAddress() { return &wsa_buf_; }
	};

} //namespace IocpGameServer