#pragma once
#include <string>

namespace IocpGameServer {

	// 소켓의 message_buffer에 들어가는 구조체.
	// 소켓은 핸들러를 돌려서 일정 주기마다
	// message_buffer에서 이 구조체를 꺼내
	// 클라이언트에 데이터를 전송한다.
	struct PacketMessage {
		// API 프로토콜 아이디
		const unsigned char kProtocol;

		// 데이터
		const std::string data;

		explicit PacketMessage(const unsigned char protocol, const std::string& data) : kProtocol(protocol), data(data) {}
		explicit PacketMessage(const unsigned char protocol) : kProtocol(protocol) {}
	};
} //namespace IocpGameServer